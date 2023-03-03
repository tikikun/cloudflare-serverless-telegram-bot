import { TelegramOps } from "./webhookListen";

addEventListener('scheduled', event => {
	event.waitUntil(main());
});

async function main(
	fromCurrency: string = 'usd',
	toCurrency: string = 'vnd',
	crypto_name: string = 'bitcoin',
	key: string = TELEGRAM_KEY,
	chatId: string = CHATID
): Promise<Response> {
	// info
	var fx_json: any;
	var crypto_json: any;

	try {
		var [fx_json, crypto_json]: any = await Promise.all([
			(await getFxRateFromApi(fromCurrency + '/' + toCurrency)).json(),
			(await getCyptoUsdFromApi(crypto_name)).json(),
		]);
	} catch (error) {
		return new Response(`Cannot get rate here is the error ${error}`);
	}

	console.log(fx_json);
	// send to telegram
	try {
		await sendMessage(
			chatId,
			`Today fx rate of pair *${fromCurrency + '/' + toCurrency}* is ${Number(
				fx_json[toCurrency]
			).toFixed(2)}
			The price of *bitcoin* in USD is ${Number(crypto_json.data.priceUsd).toFixed(2)}`,
			key
		);
		return new Response('sucessfully send messages to telegram');
	} catch (error) {
		return new Response(`Not successfully sent, error is ${error}`);
	}
}

async function getFxRateFromApi(fx_pair: string) {
	return fetch(
		`https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/${fx_pair}.json`
	);
}

async function getCyptoUsdFromApi(crypto_name: string) {
	return fetch(`https://api.coincap.io/v2/assets/${crypto_name}`, {
		headers: {
			accept: 'application/json',
		},
	});
}

const sendMessage: TelegramOps = async (chatId: string, key: string, content: string) => {
	fetch(`https://api.telegram.org/bot${key}/sendMessage`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			chat_id: chatId,
			text: content,
			disable_notification: false,
			parse_mode: 'markdown',
		}),
	});
}

export { getFxRateFromApi, sendMessage, getCyptoUsdFromApi };
