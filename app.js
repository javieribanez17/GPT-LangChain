//Librerias necesarias
const express = require("express");
const ejs = require("ejs");
const app = express();
const bodyParser = require("body-parser");
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
//Paquetes de LangChain para Embeddings
/*const { BufferMemory } = require("langchain/memory");
const { ConversationChain } = require("langchain/chains");*/
//Variables de entorno
const PORT = process.env.PORT || 5000;
//------------------------------------- Modelo para Janssen -------------------------------------
// const parser = StructuredOutputParser.fromNamesAndDescriptions({
//   medicamentos: "Medicamentos consumidos por el paciente separados ','",
//   sintomas: "Sintomas que tiene el paciente separados por ','",
// });
const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    paciente: z.object({
      genero: z.string().describe("Genero del paciente"),
      iniciales: z
        .string()
        .describe("Letras iniciales del nombre del paciente"),
      edad: z.string().describe("Edad del paciente al presentar la queja"),
      nacimiento: z.string().describe("Fecha de nacimiento"),
      altura: z.string().describe("Estatura del paciente"),
      peso: z.string().describe("Peso del paciente"),
    }),
    descripcion: z.object({
      indicacion: z.string().describe("Indicación del paciente"),
      medicacion: z.string().describe("Medicación previa del paciente"),
      id: z.string().describe("ID del paciente"),
      medicamentos: z
        .array(z.string())
        .describe("Medicamentos consumidos por el paciente"),
      via: z.string().describe("Vía de administración del medicamento"),
      dosis: z.string().describe("Dosis del medicamento consumida"),
      sintomas: z.array(z.string()).describe("Sintomas del paciente"),
    }),
    producto: z.object({
      nombre: z.string().describe("Nombre dle producto"),
      lugar: z.string().describe("Donde fue comprado el prodcuto"),
    }),
    informante: z.object({
      tipo: z.string().describe("Tipo de informante que realizó el reporte"),
      nombre: z.string().describe("Nombre del informante"),
      pais: z.string().describe("País desde donde reporta"),
    }),
    fechas: z.object({
      notificacion: z
        .string()
        .describe("Fecha de la primera notificación o reporte"),
      actual: z.string().describe("Fecha actual del reporte"),
      uso: z
        .string()
        .describe("Cuando empezó el paciente a consumir el medicamento"),
    }),
  })
);
const formatInstructions = parser.getFormatInstructions();
const prompt = new PromptTemplate({
  template: "Extrae la siguiente información:\n{format_instructions}\n A partir del texto:\n{text}\nSi no encuentras algunos datos dentro del texto deja su valor vacío",
  inputVariables: ["text"],
  partialVariables: { format_instructions: formatInstructions },
});
const model = new OpenAI({
  modelName: "gpt-3.5-turbo",
  openAIApiKey: process.env.OPEN_AI_KEY,
  temperature: 0.2,
});
const chain = new LLMChain({
  llm: model,
  prompt: prompt,
});
//--------------------------------------------------------------------------
//Certificado deshabilitado
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
//------------------------------------- Modelo para Embeddings -------------------------------------

//chatbot example
/*const model2 = new OpenAI({
    openAIApiKey: process.env.OPEN_AI_KEY,
});
const memory = new BufferMemory();
const chain2 = new ConversationChain({ llm: model, memory: memory });*/
//Llamando al home del servidor
//Variables
let consultPrev = "";
let respondModel = "";
let jsonOutputM;
let jsonArray = [];

app.get("/", async function (req, res) {
  //const test = await chain.call({year:"2018"});
  /*const test1 = await chain2.call({ input: "Hola, soy Javier Ibáñez" });
    console.log(test1);
    const test2 = await chain2.call({ input: "Cómo me llamo?" });
    console.log(test2);*/
  res.render("home", {
    respondModel: respondModel.text,
    consultPrev: consultPrev,
  });
});

app.get("/test", (req, res) => {
  const paciente = {
  "paciente" :  {
    "genero" : "Femenino",
    "iniciales": "C",
    "edad": "18",
    "nacimiento": "2003-01-01",
    "altura": "160 cm",
    "peso": "60 kg"
  },
  "descripcion": {
    "indicacion": "Dolor de cabeza",
    "medicacion": "Ninguna",
    "id": "col-1234",
    "medicamentos": ["Acetaminofen", "hiola", "aaaa"],
    "via": "Oral",
    "dosis": "500 mg",
    "sintomas": ["Dolor de cabeza", "Vómitos"]
  },
  "producto": {
    "nombre": "",
    "lugar": ""
  },
  "informante": {
    "tipo": "Paciente",
    "nombre": "Carolina Mesa",
    "pais": "Colombia"
  },
  "fechas": {
    "notificacion": "2021-09-15",
    "actual": "2021-09-15",
    "uso": "2021-09-14"
  }
}
jsonArray.push(paciente)
  res.render("table"
  ,{
    //paciente: jsonOutputM
    paciente: jsonArray
    //paciente: paciente
  }
  );
});

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
  console.log(respondModel);
  jsonOutputM = await JSON.parse(respondModel.text);
  jsonArray.push(jsonOutputM)
  /*console.log(
    "Los medicamentos son: " +
      jsonOutputM.medicamentos +
      " y los sintomas son: " +
      jsonOutputM.sintomas
  );*/
  res.redirect("/");
});
//Inicialización del servidor
app.listen(PORT, function () {
  console.log("Servidor corriendo en el puerto 3000");
});
