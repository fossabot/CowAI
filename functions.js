require("dotenv").config();
const jokes = require("./jokes");
const google = require("google-it");
const fetch = require("node-fetch");
const xml = require("xml-js");
const TaiwanEarthquake = require("./taiwanearthquake");
const moment = require("moment");
const fs = require("fs");
const download = require("download");
const weather = require("weather-js");
const yts = require("yt-search");

const Time = () => {
  return new Promise((resolve, reject) => {
    resolve({
      name: "Time",
      response: { content: moment().format("yyyy年MM月DD日 HH:mm:ss") },
    });
  });
};
const MCJavaServer = (args) => {
  return new Promise(async (resolve, reject) => {
    const response = await fetch(`https://api.mcsrvstat.us/3/${args.server}`);
    var body = await response.json();
    if (body.icon) delete body.icon;
    resolve({
      name: "MCJavaServer",
      response: { content: body },
    });
  });
};
const MCBedrockServer = (args) => {
  return new Promise(async (resolve, reject) => {
    const response = await fetch(
      `https://api.mcstatus.io/v2/status/bedrock/${args.server}`
    );
    const body = await response.json();
    resolve({
      name: "MCBedrockServer",
      response: { content: body },
    });
  });
};
const Joke = () => {
  return new Promise((resolve, reject) => {
    resolve({
      name: "Joke",
      response: { content: jokes[Math.floor(Math.random() * jokes.length)] },
    });
  });
};
const Google = async (args) => {
  return new Promise(async (resolve, reject) => {
    resolve({
      name: "Google",
      response: {
        results: await google({ query: args.query, disableConsole: true }),
      },
    });
  });
};
const Browser = async (args) => {
  return new Promise(async (resolve, reject) => {
    const response = await fetch(args.url);
    const body = await response.text();
    resolve({
      name: "Browser",
      response: { content: body },
    });
  });
};
const Invoice = async () => {
  return new Promise(async (resolve, reject) => {
    const response = await fetch("https://invoice.etax.nat.gov.tw/invoice.xml");
    const body = await response.text();
    const resu = xml.xml2js(body, {
      ignoreComment: true,
      alwaysChildren: true,
    });
    const title =
      resu.elements[0].elements[0].elements[4].elements[0].elements[0].cdata;
    const content =
      resu.elements[0].elements[0].elements[4].elements[3].elements[0].cdata.split(
        "</p><p>"
      );
    content[0] = content[0].split("<p>")[1];
    content[content.length - 1] = content[content.length - 1].split("</p>")[0];
    resolve({
      name: "Invoice",
      response: { month: title, numbers: content },
    });
  });
};

const GenerateImage = async (args) => {
  return new Promise(async (resolve, reject) => {
    const prompt = args.prompt || args.image;
    if (!prompt)
      return resolve({
        name: "GenerateImage",
        response: {
          error:
            'No prompt specified. Make sure to put your prompt in the "prompt" property.',
        },
      });
    const Client = (await import("@gradio/client")).Client;
    const client = await Client.connect(
      "https://black-forest-labs-flux-1-schnell.hf.space",
      {
        hf_token: process.env.HF_ACCESS_TOKEN,
      }
    );
    const result = (
      await client.predict("/infer", {
        prompt,
        seed: args.seed || 0,
        randomize_seed: !args.seed ? true : false,
        width: args.width || 1024,
        height: args.height || 1024,
      })
    ).data;
    const id = result[0].path.split("/tmp/gradio/")[1].split("/")[0];
    fs.writeFileSync(`images/${id}.webp`, await download(result[0].url));
    resolve({
      name: "GenerateImage",
      response: {
        url: `https://cowai.cowgl.xyz/api/images/${id}.webp`,
        seed: result[1],
      },
    });
  });
};
const GetWeather = async (args) => {
  return new Promise(async (resolve, reject) => {
    const query = args.query || args.location;
    if (!query)
      return resolve({
        name: "GetWeather",
        response: {
          error: "No query provided",
        },
      });
    weather.find({ search: query, degreeType: "C" }, function (err, result) {
      if (err)
        return resolve({
          name: "GetWeather",
          response: {
            error: err.stack,
          },
        });
      var result = [...result][0];
      if (result.location.imagerelativeurl)
        delete result.location.imagerelativeurl;
      if (result.current.imageUrl) delete result.current.imageUrl;
      resolve({
        name: "GetWeather",
        response: result,
      });
    });
  });
};
const SearchRepository = async (args) => {
  return new Promise(async (resolve, reject) => {
    const query = args.query || args.q;
    if (!query)
      return resolve({
        name: "SearchRepository",
        response: {
          error:
            'No query specified. Make sure to put your query in the "query" property.',
        },
      });
    const { Octokit } = await import("@octokit/rest");
    const octokit = new Octokit();
    octokit.rest.search.repos({ q: query }).then(({ data }) => {
      return resolve({
        name: "SearchRepository",
        response: {
          result: data,
        },
      });
    });
  });
};
const SearchVideo = async (args) => {
  return new Promise(async (resolve, reject) => {
    const query = args.query || args.q;
    if (!query)
      return resolve({
        name: "SearchVideo",
        response: {
          error:
            'No query specified. Make sure to put your query in the "query" property.',
        },
      });
    const videos = (await yts(query)).videos;
    return resolve({
      name: "SearchVideo",
      response: {
        result: videos,
      },
    });
  });
};

const available_functions = {
  Time,
  MCJavaServer,
  MCBedrockServer,
  Joke,
  Google,
  Browser,
  Invoice,
  LatestEarthquake: TaiwanEarthquake.latest,
  LatestMajorEarthquake: TaiwanEarthquake.major,
  LatestLocalEarthquake: TaiwanEarthquake.local,
  GetEarthquakeByID: TaiwanEarthquake.id,
  GenerateImage,
  GetWeather,
  SearchRepository,
  SearchVideo,
};
module.exports = available_functions;
