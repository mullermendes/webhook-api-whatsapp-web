"use strict";

let chatgpt = true;

// Access token for your app
// (copy token from DevX getting started pagee
// and save it as environment variable into the .env file)
const token = process.env.WHATSAPP_TOKEN;

// Imports dependencies and set up http server
const request = require("request"),
  express = require("express"),
  body_parser = require("body-parser"),
  axios = require("axios").default,
  app = express().use(body_parser.json()); // creates express http server

const { Configuration, OpenAIApi } = require("openai");
const https = require("https");

const api = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

let contar = 0;
// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));

// Accepts POST requests at /webhook endpoint
app.post("/webhook", async function (req, res) {
  // Parse the request body from the POST
  let body = req.body;

  // Check the Incoming webhook message
  //console.log(JSON.stringify(req.body, null, 2));

  // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      let phone_number_id =
        req.body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
      let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload
      
      envia_chat(phone_number_id, token, from, msg_body, res);  
    }
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    res.sendStatus(404);
  }
});

// Accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhook", (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
   **/
  const verify_token = process.env.VERIFY_TOKEN;

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === verify_token) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

const sendReply = (phone_number_id, whatsapp_token, to, reply_message, resp) => {
  //console.log("Enviando");
 let json = {
    messaging_product: "whatsapp",
    to: to,
    text: { body: reply_message },
  };
  let data = JSON.stringify(json);
  let path = "/v16.0/"+phone_number_id+"/messages?access_token="+whatsapp_token;
  let options = {
    host: "graph.facebook.com",
    path: path,
    method: "POST",
    headers: { "Content-Type": "application/json" }
  };
  let callback = (response) => {
    let str = "";
    response.on("data", (chunk) => {
      str += chunk;
    });
    response.on("end", () => {
    });
  };
  let req = https.request(options, callback);
  req.on("error", (e) => {});
  req.write(data);
  req.end();
  //console.log("Enviou");
  resp.sendStatus(200);
}

async function envia_chat(phone_number_id, token, from, msg_body, res){
  let enviar = true;
  if(chatgpt){
    console.log("Pergunta:", msg_body);
    try {
      const completion = await api.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{"role": "system",
                    //"content": "Você é uma assistente engraçada e positiva. "},
                    "content": "Você agora é uma assitente de atendimento de um brechó chamado Mala Rosa Brechó situado no Guará 2 em Brasília - DF. O foco da Mala rosa brechó é atender suas clientes oferencendo peças lindas second to hand e satisfazelas da melhor forma possível. O Projeto MalaRosa brechó surgiu em 2017 com a ideia de ampliar o conceito de moda sustentável. É possível ser fashion, pagar barato e ainda contribuir com uma causa importantíssima, a sustentabilidade. Estamos com vagas abertas em nossos grupos privados no WhatsApp, vem com a gente!?"},
                   { role: "user", content: msg_body }],
        max_tokens: 1000,
        temperature: 0.9,
        top_p: 0.5,
        frequency_penalty: 0.25,
        presence_penalty: 0.25,
      });
      msg_body = completion.data.choices[0].message.content;
      console.log("Resposta:", msg_body);
    } catch (e) {
      console.error("ERROR" + e);
      enviar = false;
    }
  }
  if(enviar){
    //console.log("CONTANDO " + contar)
  contar = contar + 1;
  sendReply(phone_number_id, token, from, msg_body, res);
  }else{
    sendReply(phone_number_id, token, from, "Desculpe, pode repetir!", res);
  }
}