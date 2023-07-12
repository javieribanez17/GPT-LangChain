//Librerias necesarias
const express = require("express");
const ejs = require("ejs");
const app = express();
const bodyParser = require("body-parser");
//Declaraciones necesarias
require("dotenv").config();
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
const { OpenAI } = require("langchain/llms/openai");
const { PromptTemplate } = require("langchain/prompts");
const { LLMChain } = require("langchain/chains");
const { CommaSeparatedListOutputParser  } = require("langchain/output_parsers");
/*const { BufferMemory } = require("langchain/memory");
const { ConversationChain } = require("langchain/chains");*/
//Variables de entorno 
const PORT = process.env.PORT || 3000;
//Llamado a modelo de Open AI
const parser = new CommaSeparatedListOutputParser();
const formatInstructions = parser.getFormatInstructions();
const prompt = new PromptTemplate({
    template: "Dime los sintomas que tiene el paciente en el texto: {text}\n{format_instructions}",
    inputVariables: ["text"],
    partialVariables: { format_instructions: formatInstructions },
});
const model = new OpenAI({
    modelName: "gpt-3.5-turbo",
    openAIApiKey: process.env.OPEN_AI_KEY,
    temperature: 0.2
});
const chain = new LLMChain({
    llm: model,
    prompt: prompt
});
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
app.get("/", async function (req, res) {
    //const test = await chain.call({year:"2018"});
    /*const test1 = await chain2.call({ input: "Hola, soy Javier Ibáñez" });
    console.log(test1);
    const test2 = await chain2.call({ input: "Cómo me llamo?" });
    console.log(test2);*/
    res.render("home", {
        respondModel: respondModel.text,
        consultPrev: consultPrev
    });
})
app.post("/gpt", async function (req, res) {
    consultPrev = req.body.questionModel;
    const qModel = await prompt.format({
        text: consultPrev,
    });
    respondModel = await chain.call({text:qModel});
    res.redirect("/");
})
//Inicialización del servidor
app.listen(PORT, function () {
    console.log("Servidor corriendo en el puerto 3000");
})