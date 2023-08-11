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
      triage: z
        .string()
        .describe(
          "Si el paciente esta en peligro de muerte:{Critico}\nSi requiere hospitalización:{Urgente}\nSi no es ni Critico ni urgente:{General}"
        ),
      nombre: z.string().describe("Nombre del paciente"),
      genero: z.string().describe("¿El paciente es hombre o mujer?"),
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
      id: z.string().describe("¿Cuál es el Patient ID?"),
      medicamentos: z
        .array(z.string())
        .describe("Medicamentos consumidos por el paciente"),
      via: z.string().describe("Vía de administración del medicamento"),
      dosis: z.string().describe("Dosis del medicamento consumida"),
      sintomas: z.array(z.string()).describe("Sintomas del paciente"),
    }),
    producto: z.object({
      nombre: z.string().describe("Nombre del producto sospechoso"),
      lugar: z.string().describe("Dónde fue comprado el prodcuto"),
    }),
    informante: z.object({
      tipo: z
        .string()
        .describe("Relación de quien hace el reporte con el paciente"),
      nombre: z.string().describe("Nombre del informante"),
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
    "Extrae y clasifica la siguiente información:\n{format_instructions}\nA partir del texto:\n{text}\nSi no encuentras algunos datos dentro del texto deja su valor vacío excepto en 'triage'",
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
  res.render("table");
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
  //console.log(respondModel);
  jsonOutputM = await JSON.parse(respondModel.text);
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
