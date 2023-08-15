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
const { z } = require("zod");
//Variables de entorno
const PORT = process.env.PORT || 5000;
//------------------------------------- Modelo para Janssen -------------------------------------
const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    paciente: z.object({
      nombre: z.string().describe("Nombre del paciente"),
      edad: z.string().describe("Edad del paciente al presentar la queja"),
      nacimiento: z.string().describe("Fecha de nacimiento"),
      altura: z.string().describe("Estatura"),
      peso: z.string().describe("Peso"),
    }),
    descripcion: z.object({
      indicacion: z.string().describe("Indicación médica del paciente"),
      medicacion: z
        .array(z.string())
        .describe("Medicación previa del paciente"),
      id: z.string().describe("Extrae el PSP Patient ID del texto"),
      medicamentos: z
        .array(z.string())
        .describe("Medicamentos consumidos por el paciente"),
      via: z.string().describe("Vía de administración del medicamento"),
      dosis: z.string().describe("Dosis del medicamento consumida"),
      sintomas: z
        .array(z.string())
        .describe("Dime cada uno de los sintomas del paciente"),
    }),
    producto: z.object({
      nombreP: z.string().describe("Nombre del producto sospechoso"),
      lugar: z.string().describe("Dónde fue comprado el prodcuto"),
    }),
    informante: z.object({
      nombreI: z.string().describe("Nombre del informante"),
      pais: z.string().describe("País desde donde reporta"),
    }),
    fechas: z.object({
      notificacion: z.string().describe("¿Cuando realizó el primer reporte?"),
      actual: z.string().describe("Fecha del reporte actual"),
      uso: z
        .string()
        .describe("¿Cuando empezó el paciente a consumir el medicamento?"),
    }),
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
//--------------------------------------------------------------------------
//Certificado deshabilitado
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
//------------------------------------- Servidor -------------------------------------
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
  jsonOutputM = upperProps(await JSON.parse(respondModel.text));
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
