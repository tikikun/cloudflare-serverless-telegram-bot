import { getCyptoUsdFromApi, getFxRateFromApi, sendMessage } from './scheduler';

/**
 * The `Command` interface represents a function that takes in a `chatId` and a variadic number of strings,
 * and returns any type of value.
 */
interface Command {
	(chatId: string, ...args: string[]): any;
}

/**
 * The `Commands` interface represents an object that maps strings to `Command` functions.
 * The keys of the object are the command names, and the values are the corresponding functions.
 */
interface Commands {
	[commandKey: string]: Command;
}

/**
 * Template of operation related to telegram
 */
interface TelegramOps {
	(chatId: string, apiKey: string, ...args: any[]): any;
}

addEventListener('fetch', event => {
	event.respondWith(
		(() => {
			try {
				return mainListener(event.request);
			} catch (error) {
				console.error('An error occurred:', error);
				return new Response('uknown issue');
			}
		})()
	);
});

async function mainListener(request: Request) {
	const data: any = await request.json();
	// console.log(data);
	const default_fx_pair: string = 'usd/vnd';
	const apiKey: string = TELEGRAM_KEY;
	try {
		// extract relevant content
		try {
			var chatId: string = data.message.chat.id;
			var chatContent: string = data.message.text;
		} catch (error) {
			console.log('type bug but catched, now return something');
			return new Response('Not matched case');
		}

		/**
		 * Here is where the routing of the commands is defined
		 */
		const commands: Commands = {
			'/getcryptoprice': (chatId, apiKey, crypto_name) =>
				getcryptoprice(chatId, apiKey, crypto_name),
			'/getfxratevnd': (chatId, apiKey) => getfxrate(chatId, apiKey, 'usd', 'vnd'),
			'/getfxrate': (chatId, apiKey, fromCurrency, toCurrency) =>
				getfxrate(chatId, apiKey, fromCurrency, toCurrency),
			'/getbtc': (chatId, apiKey) => getcryptoprice(chatId, apiKey, 'bitcoin'),
			'/getfile': (chatId, apiKey, uri, folderName) => {
				if (!chatId || !uri || !folderName || !apiKey) {
					sendMessage(chatId, apiKey, 'No folder specified, use the root folder');
					return dominicGetFile(chatId, apiKey, uri, undefined);
				}
				return dominicGetFile(chatId, apiKey, uri, folderName);
			},
			'/listfiles': (chatId, apiKey) => dominicListFiles(chatId, apiKey),
			'/downstats': (chatId, apiKey) => dominicReportDownloadsStatus(chatId, apiKey),
			'/pauseall': (chatId, apiKey) => pauseAll(chatId, apiKey),
			'/askdom': (chatId, apiKey, ...question_parts) => askDom(chatId, apiKey, ...question_parts),
			'/quickdom': (chatId, apiKey, ...question_parts) => quickDom(chatId, apiKey, ...question_parts),

		};

		/**
		 * Here is where to extract the message data from
		 */
		const botCommand = chatContent.split(' ')[0];
		const args = chatContent.split(' ').slice(1);

		/**
		 * Here is where it will be resovled per command
		 */
		if (commands[botCommand]) {
			console.log(`serve command ${botCommand}`);
			return commands[botCommand](chatId, apiKey, ...args);
		} else {
			console.log(`The query is not a command`);
			await sendMessage(chatId, apiKey, `The query is not a command`);
			return new Response('The query is not a command');
		}
	} catch (error) {
		console.log(`unknown issue`);
		await sendMessage(data.message.chat.id, apiKey, `unknown issue`);
		return new Response('unknown issue');
	}
}
const getfxrate: TelegramOps = async (
	chatId: string,
	apiKey: string,
	fromCurrency: string,
	toCurrency: string
) => {
	try {
		let fx_json: any = await (await getFxRateFromApi(fromCurrency + '/' + toCurrency)).json();
		await sendMessage(
			chatId,
			apiKey,
			`Today fx rate of pair *${fromCurrency + '/' + toCurrency}* is ${Number(
				fx_json[toCurrency]
			).toFixed(2)}`
		);
		console.log('already sent the message');
	} catch (error) {
		console.log(error);
		await sendMessage(chatId, apiKey, `It seems there is unkown bug here is the log: ${error}`);
	}
	return new Response('Successfully get the fx rate');
};

const getcryptoprice: TelegramOps = async (chatId: string, apiKey: string, crypto_name: string) => {
	try {
		let crypto_json: any = await (await getCyptoUsdFromApi(crypto_name)).json();
		await sendMessage(
			chatId,
			apiKey,
			`The price of *${crypto_name}* in USD is ${Number(crypto_json.data.priceUsd).toFixed(2)}`
		);
		console.log('already sent the message');
	} catch (error) {
		console.log(error);
		await sendMessage(chatId, apiKey, `It seems there is unkown bug here is the log: ${error}`);
	}
	return new Response('Successfully get the crypto rate');
};

//Below is the section for dominic backend communication

/**
 *
 * @returns Get the auth headers for dominic backend
 */
const authHeaders = () =>
	new Headers({
		'Content-Type': 'application/json',
		'CF-Access-Client-Id': DOMINIC_CLIENT_ID,
		'CF-Access-Client-Secret': DOMINIC_CLIENT_SECRET,
	});

const dominicGetFile: TelegramOps = async (
	chatId: string,
	apiKey: string,
	uri: string,
	folderName: string = ''
) => {
	const url = `${dominicDomain}/${DOWNLOAD_FILE}`;
	let queryString = `uri=${uri}`;
	if (folderName) {
		queryString += `&folderName=${folderName}`;
	}

	console.log(folderName);
	console.log(`query string${queryString}`);

	const response = await fetch(`${url}?${queryString}`, {
		method: 'GET',
		headers: authHeaders(),
	});
	const data: any = await response.json();
	console.log(JSON.stringify(data));
	await sendMessage(chatId, apiKey, String(data.message));
	return new Response('Successfully send messages');
};

const dominicListFiles: TelegramOps = async (chatId: string, apiKey: string) => {
	const url = `${dominicDomain}/${LIST_STORAGE_VOLUME}`;
	const response = await fetch(url, {
		method: 'GET',
		headers: authHeaders(),
	});
	const data: any = await response.json();
	let message = 'Here are your volume structure:\n';
	for (const file of data) {
		if (!file.startsWith('.')) {
			message += `- ${file}\n`;
		}
	}

	await sendMessage(chatId, apiKey, `${message}`);
	return new Response('Successfully send messages');
};

const dominicReportDownloadsStatus: TelegramOps = async (chatId: string, apiKey: string) => {
	const url = `${dominicDomain}/${DOWNLOAD_STATS}`;

	const response = await fetch(url, {
		method: 'GET',
		headers: authHeaders(),
	});
	const downloads: any = await response.json();

	let message = '';

	downloads.forEach((download: any) => {
		message += `ID: ${download.gid} | Status: ${download.status} | File: ${
			download.files[0].path
		} | Downloaded: ${Math.round(
			(download.completedLength / download.totalLength) * 100
		)}% | Speed: ${(download.downloadSpeed / 1000000).toFixed(2)} MB/s\n`;
	});
	await sendMessage(chatId, apiKey, `${message}`);
	return new Response('Successfully send messages');
};

const pauseAll: TelegramOps = async (chatId: string, apiKey: string) => {
	const url = `${dominicDomain}/${PAUSEALL_DOWNLOADS}`;

	const response = await fetch(url, {
		method: 'GET',
		headers: authHeaders(),
	});
	const data: any = await response.json();

	await sendMessage(chatId, apiKey, `${data}`);
	return new Response('Successfully pause all ');
};

const askDom: TelegramOps = async (chatId: string, apiKey: string, ...question_parts) => {
	//console.log(DOM_ENDPOINT);
	const question = question_parts.join(' ');
	const url = `${dominicDomain}/${DOM_ENDPOINT}`;
	const queryUrl = `${url}?${new URLSearchParams({ question: question })}`;
	//console.log(queryUrl);
	const response = await fetch(queryUrl, {
		method: 'GET',
		headers: authHeaders(),
	});
	return new Response('Successfully asked Dom');
};

const quickDom: TelegramOps = async (chatId: string, apiKey: string, ...question_parts) => {
	console.log(QUICKDOM);
	const question = question_parts.join(' ');
	const url = `${dominicDomain}/${QUICKDOM}`;
	const queryUrl = `${url}?${new URLSearchParams({ question: question })}`;
	console.log(queryUrl);
	const response = await fetch(queryUrl, {
		method: 'GET',
		headers: authHeaders(),
	});
	return new Response('Successfully asked Dom');
};

export { TelegramOps };
