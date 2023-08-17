//Librerias necesarias
const express = require("express");
const ejs = require("ejs");
const app = express();
const bodyParser = require("body-parser");
const _ = require("lodash");
//Demo 2
const multer = require("multer");
const fs = require("fs");
const pdf = require("pdf-parse");
//Demo 3
const superagent = require("superagent");
const sql = require("mssql");
//Declaraciones necesarias
require("dotenv").config();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
//Paquetes de LangChain para Janssen
const { OpenAI } = require("langchain/llms/openai");
const { PromptTemplate } = require("langchain/prompts");
const { LLMChain } = require("langchain/chains");
const { StructuredOutputParser } = require("langchain/output_parsers");
const { z, object } = require("zod");
//Variables de entorno
const PORT = process.env.PORT || 5000;
//------------------------------------- Modelo para Janssen -------------------------------------
const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    //paciente
    numero_paciente: z.string().describe("Extrae el PSP Patient ID del texto"),
    iniciales: z
      .string()
      .describe("Cuáles son las iniciales del nombre del paciente"),
    genero: z.string().describe("Dime el género sexual del paciente"),
    edad: z.string().describe("Edad del paciente al presentar la queja"),
    altura: z.string().describe("Estatura"),
    peso: z.string().describe("Peso"),
    indicacion: z.string().describe("Indicación médica del paciente"),
    fecha_nacimiento: z.string().describe("Fecha de nacimiento"),
    nombre_product: z.string().describe("Nombre del producto sospechoso"),
    dosis: z.string().describe("Dosis del medicamento consumida"),
    via_de_admi: z.string().describe("Vía de administración del medicamento"),
    comprado_en: z.string().describe("Dónde fue comprado el prodcuto"),
    prod_concomitante: z
      .array(z.string())
      .describe("productos concomitantes consumidos por el paciente"),
    informante: z.string().describe("Relación del informante con el paciente"),
    nombre: z.string().describe("Nombre del informante"),
    apellido: z.string().describe("Apellido del informante"),
    pais: z.string().describe("País desde donde reporta"),
    permiso: z.string().describe("¿Hay autorización para contactar?"),
    ini_product: z
      .string()
      .describe("¿Cuando empezó el paciente a consumir el medicamento?"),
    notificacion1: z.string().describe("¿Cuando realizó el primer reporte?"),
    //descripcion
    medicacion: z.array(z.string()).describe("Medicación previa del paciente"),
    // medicamentos: z
    //   .array(z.string())
    //   .describe("Medicamentos consumidos por el paciente"),
    sintomas: z
      .array(z.string())
      .describe("Dime cada uno de los sintomas del paciente"),
  })
);
const formatInstructions = parser.getFormatInstructions();
const prompt = new PromptTemplate({
  template:
    "Extrae y determina la siguiente información:\n{format_instructions}\nDel texto:\n{text}\n" +
    "Ten en cuenta que sino puedes extraer algún dato del texto debes dejar su valor vacío",
  inputVariables: ["text"],
  partialVariables: { format_instructions: formatInstructions },
});
const model = new OpenAI({
  modelName: "gpt-3.5-turbo",
  openAIApiKey: process.env.OPEN_AI_KEY,
  temperature: 0,
});
const chain = new LLMChain({
  llm: model,
  prompt: prompt,
});
//Archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads"); // Ruta donde se guardarán los archivos subidos
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Usa el nombre original del archivo
  },
});
//Variables
const upload = multer({ storage });
let respondModelA = [];
let qModel = "";
let pdfTitle = "";
let consultPrev = "";
let respondModel = "";
let jsonOutputM;
let jsonArray = [];
let resultQuery;
let nullArrayParams = [];
const parametrs = [
  "id",
  "numero_paciente",
  "iniciales",
  "genero",
  "edad",
  "altura",
  "peso",
  "indicacion",
  "fecha_nacimiento",
  "nombre_product",
  "dosis",
  "via_de_admi",
  "comprado_en",
  "prod_concomitante",
  "informante",
  "nombre",
  "apellido",
  "pais",
  "permiso",
  "descripcion",
  "ini_product",
  "notificacion1",
];
//--------------------------------------------------------------------------
//Certificado deshabilitado
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
//Conexión a la base de datos
const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: true, // for azure
    trustServerCertificate: false, // change to true for local dev / self-signed certs
  },
};
let pool;
try {
  pool = new sql.ConnectionPool(sqlConfig);
} catch (err) {
  console.log(err);
}
//Funciones de limpieza
function upperProps(object) {
  object.descripcion.medicamentos = _.map(
    object.descripcion.medicamentos,
    (medicamento) => _.upperCase(medicamento)
  );
  object.descripcion.sintomas = _.map(object.descripcion.sintomas, (sintoma) =>
    _.upperCase(sintoma)
  );
  return object;
}
function fineResultQuery(arrayResutl) {
  arrayResutl.forEach((object) => {
    // object.genero
    //   ? (object.genero = _.upperCase(object.genero))
    //   : object.genero;
    if (object.prod_concomitante) {
      object.prod_concomitante = object.prod_concomitante.split(", ");
      object.prod_concomitante = _.map(object.prod_concomitante, (product) =>
        _.upperCase(product)
      );
    }
  });
  return arrayResutl;
}
function dataNullArray(arrayQuery) {
  nullArrayParams = [];
  parametrs.forEach((param) => {
    if (arrayQuery[0][param] == null) {
      nullArrayParams.push(param);
    }
  });
}
//------------------------------------- Servidor -------------------------------------
//Llamando al home del servidor
app.get("/", async function (req, res) {
  res.render("home");
});
//Llamando al demo 1
app.get("/demo1", (req, res) => {
  res.render("demo1", {
    respondModel: respondModel.text,
    consultPrev: consultPrev,
  });
});
//Llamando al demo 2
app.get("/demo2", (req, res) => {
  res.render("upload");
});
//Llamado al demo 3
app.get("/demo3", async (req, res) => {
  res.render("demo3", {
    resultQuery: JSON.stringify(resultQuery),
    paciente: resultQuery,
    respondModel: jsonArray,
  });
});
//Respuesta a petición del modelo
app.get("/activeModel", async (req, res) => {
  let qModel = "";
  try {
    qModel = await prompt.format({
      text: resultQuery[0].descripcion,
    });
    respondModel = await chain.call({ text: qModel });
  } catch (err) {
    console.log("Hubo un error al comunicarse con el modelo de OpenAI: " + err);
  }
  const finalJson = resultQuery.map(obj => ({...obj}));
  const idd = { id: resultQuery[0].id };
  jsonOutputM = await JSON.parse(respondModel.text); //upperProps(await JSON.parse(respondModel.text));
  jsonOutputM = { ...idd, ...jsonOutputM };
  jsonArray.push(jsonOutputM);
  // const finalJson = jsonArray.map(obj => ({...obj}));

  finalJson.forEach(obj1 => {
    const obj2 = findById(obj1.id);
    if(obj2){
      for (const prop in obj1){
        if(obj1[prop] === null && obj2[prop] !== undefined){
          obj1[prop] = obj2[prop];
        }
      }
    }
  })
  finalJson[ini_product] = jsonArray[ini_product]

  console.log(finalJson)
  // console.log(jsonArray);
  res.redirect("/demo3");
});

function findById(id){
  return jsonArray.find(obj => obj.id === id);
}

//Respuesta al demo3
app.post("/demo3-search", async (req, res) => {
  let numCase = req.body.numCase;
  let orderColumns =
    "id, numero_paciente, iniciales, genero, edad, altura, peso, " +
    "indicacion, fecha_nacimiento, nombre_product, dosis, via_de_admi, comprado_en, " +
    "prod_concomitante, informante, nombre, apellido, pais, permiso, descripcion, ini_product, notificacion1";
  // Abrir la conexión
  await pool
    .connect()
    .then(() => {
      // Realizar consulta
      const query = `SELECT ${orderColumns} FROM triage WHERE id = ${numCase}`;
      return pool.request().query(query);
    })
    .then((result) => {
      // Procesar resultado de la consulta
      resultQuery = result.recordset;
      dataNullArray(resultQuery);
      fineResultQuery(resultQuery);
    })
    .catch((err) => {
      // Manejar errores
      console.error(err);
    })
    .finally(() => {
      // Cerrar la conexión
      pool.close();
    });
  // try {
  //   qModel = await prompt.format({
  //     text: resultQuery[0].descripcion,
  //   });
  //   respondModel = await chain.call({ text: qModel });
  // } catch (err) {
  //   console.log("Hubo un error al comunicarse con el modelo de OpenAI: " + err);
  // }
  // jsonOutputM = await JSON.parse(respondModel.text); //upperProps(await JSON.parse(respondModel.text));
  // jsonArray.push(jsonOutputM);

  res.redirect("/demo3");
});
//Respuesta del demo 1
app.post("/gpt", async function (req, res) {
  consultPrev = req.body.questionModel;
  let qModel = "";
  try {
    qModel = await prompt.format({
      text: consultPrev,
    });
    respondModel = await chain.call({ text: qModel });
  } catch (err) {
    console.log("Hubo un error al comunicarse con el modelo de OpenAI: " + err);
  }
  jsonOutputM = await JSON.parse(respondModel.text); //upperProps(await JSON.parse(respondModel.text));
  jsonArray.push(jsonOutputM);
  //Redirect same page
  res.redirect("/demo1");
  //Envío de datos por HTTPS
  superagent
    .post(process.env.HTTPS_SERVER)
    .send(jsonArray)
    .then(console.log("Envío realizado"))
    .catch(console.error);

  jsonArray = [];
});
//Página con archivo de carga
app
  .route("/upload")
  .get((req, res) => {
    res.render("upload");
  })
  .post((req, res) => {
    res.render("upload");
  });

//Respuesta a la carga del archivo
app
  .route("/load")
  .get((req, res) => {
    res.render("demo2", {
      pdfTitle: pdfTitle,
      paciente: respondModelA,
      consultPrev: consultPrev,
    });
  })
  .post(upload.single("loadFile"), async (req, res) => {
    //Variables locales
    let pdfPath = req.file.path;
    pdfTitle = req.file.originalname;
    let contentPdf = "";
    let vectorStore = "";
    //Lectura del PDF
    const databuffer = fs.readFileSync(pdfPath);
    await pdf(databuffer).then(function (data) {
      contentPdf = data.text;
      //res.send(contentPdf);
    });
    const reports = contentPdf.split(/\n\s*\n/);
    //Llamdo al modelo de IA
    for (const report of reports) {
      if (report != "") {
        try {
          qModel = await prompt.format({
            text: report,
          });
          respondModel = await chain.call({ text: qModel });
          jsonOutputM = upperProps(await JSON.parse(respondModel.text));
          respondModelA.push(jsonOutputM);
        } catch (err) {
          console.log(
            "Hubo un error al comunicarse con el modelo de OpenAI: " + err
          );
        }
      }
    }
    //Envío de datos por HTTPS
    superagent
      .post(process.env.HTTPS_SERVER)
      .send(respondModelA)
      .then(console.log("Envío realizado"))
      .catch(console.error);
    //Renderiza la tabla con los datos
    res.render("demo2", {
      pdfTitle: pdfTitle,
      paciente: respondModelA,
      consultPrev: consultPrev,
    });
  });
//Route for excel and Power BI
app.get("/test", (req, res) => {
  res.render("demoTest", {
    pdfTitle: pdfTitle,
    paciente: respondModelA,
    consultPrev: consultPrev,
  });
});
//Inicialización del servidor
app.listen(PORT, function () {
  console.log("Servidor corriendo en el puerto 3000");
});
