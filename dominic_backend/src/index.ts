import { OpenAIChat } from 'langchain/llms';
import { BufferWindowMemory } from "langchain/memory";
import { ConversationChain } from "langchain/chains";
import { HNSWLib } from "langchain/vectorstores";
import { OpenAIEmbeddings } from "langchain/embeddings";

import express, { Request, Response } from 'express';
import * as fs from 'fs';

// Reading configuration from file
const configFilePath = '../backend_config.json';

// Read the JSON file synchronously and parse its contents into a JavaScript object
const configFileContents = fs.readFileSync(configFilePath, 'utf-8');
const configObject = JSON.parse(configFileContents);

// Initiate openai service
const model = new OpenAIChat({ openAIApiKey:configObject.openaikey,modelName: 'gpt-3.5-turbo' });
const memory = new BufferWindowMemory({ k: 30 });
const chain = new ConversationChain({ llm: model, memory: memory });
const embeddings = new OpenAIEmbeddings({ openAIApiKey:configObject.openaikey});

// Command list
const com_list = ['getfxrate - fxrate',
'getfxratevnd - fxrateVND',
'getcryptoprice - get crypto price',
'getbtc - get bitcoin price',
'listfiles - listfiles on the server now',
'getfile - download the file using the link',
'downstats - get status of downloads',
'pauseall - pause all operation (seeding)',
'askdom - to ask Dom (memory size 30']

// Set up vector store
const vectorStore = await HNSWLib.fromTexts(
	com_list,
	Array.from({ length: com_list.length }, (_, i) => ({ id: i })),
	embeddings
  );
  

const app = express();

app.use(express.json());

app.get('/downloadfile', async (req: Request, res: Response) => {
	const uri = String(req.query.uri);
	const folderName = req.query.folderName ? String(req.query.folderName) : '';
	console.log(folderName);
	if (!uri) {
		return res.send(
			JSON.stringify({
				message: 'Uri is required to download thing',
			})
		);
	}

	console.log(req.method, req.url, `Here is the uri for the file ${uri}`);

	try {
		const aria_response = await sendMagnetToAria2c(uri, folderName);
		if ('error' in aria_response) {
			console.log('send the issue');
			res.send(
				JSON.stringify({
					message: `There is error,Issue:${aria_response.error.message}`,
				})
			);
		} else {
			res.send(
				JSON.stringify({
					message: `Success, the job ID is: ${aria_response.id}`,
				})
			);
		}
	} catch (error) {
		console.log(error);
		res.send(
			JSON.stringify({
				message: `There is strange error, here is log ${error}`,
			})
		);
	}
});

/**
 * Lists the contents of a directory and returns the result as a JSON response.
 *
 * @param req - Express.js request object
 * @param res - Express.js response object
 *
 * @returns JSON response with a list of filenames in the directory. In case of an error, returns a JSON response with a 500 status code and an error message.
 */
app.get('/listfiles', (req: Request, res: Response) => {
	try {
		const files = fs.readdirSync('/Volumes/Tuandisk');
		const folders = [];
		for (const file of files) {
			const stats = fs.statSync(`/Volumes/Tuandisk/${file}`);
			if (stats.isDirectory()) {
				folders.push(file);
			}
		}
		res.json(folders);
	} catch (err) {
		res.status(500).json({ error: err });
	}
});

app.get('/alantest', async (req: Request, res: Response, next) => {
	console.log('thunghiem auth');
	res.send('thunghiem nay ');
});

app.get('/downloads', async (req: Request, res: Response) => {
	try {
		const response = await fetch('http://localhost:6800/jsonrpc', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				method: 'aria2.tellActive',
				id: 'downloads',
				jsonrpc: '2.0',
			}),
		});
		const data = await response.json();
		res.json(data.result);
	} catch (err) {
		res.status(500).json({ err });
	}
});

app.get('/pauseAll', async (req: Request, res: Response) => {
	try {
		const response = await fetch('http://localhost:6800/jsonrpc', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				method: 'aria2.pauseAll',
				id: 'stop_all_torrents',
				jsonrpc: '2.0',
			}),
		});
		const data = await response.json();
		res.json(data.result);
	} catch (err) {
		res.status(500).json({ err });
	}
});

app.get('/notiDownloaded', async (req: Request, res: Response) => {
	try {
		// Get status of downloading files from json rpc
		const gid: string = String(req.query.gid);
		const response_downstats = await fetch('http://localhost:6800/jsonrpc', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				method: 'aria2.tellStatus',
				id: gid,
				jsonrpc: '2.0',
				params: [gid],
			}),
		});
		const responseJson = await response_downstats.json();
		const result = responseJson.result;

		const files_path: string[] = [];
		result.files.forEach((file: any) => {
			files_path.push(file.path);
		});

		// Build message
		var message = 'Home servers have finished downloading the files:\n';
		files_path.forEach(item => {
			message += '\t🗿🗿 ' + item + '\n';
		});

		// Send message to telegram user
		await sendTelegramMessage(message, 'markdown');
	} catch (err) {
		res.status(500).json({ err });
	}
});

app.get('/askDom', async (req: Request, res: Response) => {
	try {
		const question = String(req.query.question);
		const openAiResponse = await chain.call({ input: question });
		console.log(openAiResponse.response)
		res.send(openAiResponse.response)
		await sendTelegramMessage(openAiResponse.response, 'markdown');
		;
	} catch (err) {
		res.status(500).json({ err });
	}

});

app.get('/quickDom',async (req:Request, res: Response) => {
	try {
		const question = String(req.query.question);
		const result = await vectorStore.similaritySearchWithScore(question);
		console.log(result)
		res.json(result)
		//const answer = await model.call(question);
		//console.log(answer)
		//res.send(answer)
		//await sendTelegramMessage(answer, 'markdown');
		;
	} catch (err) {
		res.status(500).json({err})
	}
})

app.listen(3000, () => {
	console.log('Server listening on port 3000');
});

async function sendMagnetToAria2c(uri: string, folder: string) {
	const rootDir = '/Volumes/Tuandisk';
	const aria2cUrl = 'http://localhost:6800/jsonrpc';
	const id =
		Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
	console.log(`${rootDir}/${folder}`);
	const options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: id,
			method: 'aria2.addUri',
			params: [[uri], { dir: `${rootDir}/${folder}` }],
		}),
	};

	const response = await fetch(aria2cUrl, options);
	const data = await response.json();
	console.log(data);
	return data;
}

async function sendTelegramMessage(message: string, parse_mode: string) {
	const chat_id = configObject.chat_id;
	const telegram_key = configObject.telegram_key;

	const payload = {
		chat_id: chat_id,
		text: message,
		disable_notification: false,
		parse_mode: parse_mode,
	};
	const response = await fetch(`https://api.telegram.org/bot${telegram_key}/sendMessage`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}
