// scraper.js
const appendLeadsToSheet = require("./googleSheets");
const puppeteer = require("puppeteer");

async function tryScrapeDetailPage(page, url, retries = 3) {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			await page.goto(url, { waitUntil: "domcontentloaded" });
			await page.waitForTimeout(4000);

			const agentData = await page.evaluate(() => {
				const name =
					document.querySelector('[data-testid="listing-agent-name"]')
						?.innerText || "N/A";
				const phone =
					document.querySelector('[data-testid="listing-agent-phone"]')
						?.innerText || "N/A";
				let email = "N/A";
				for (const a of document.querySelectorAll("a")) {
					if (a.href.includes("mailto:")) email = a.href.replace("mailto:", "");
				}
				return { name, phone, email };
			});

			return agentData;
		} catch (err) {
			console.warn(`Retry ${attempt} failed for ${url}`);
			if (attempt === retries) throw err;
			await page.waitForTimeout(2000 * attempt); // backoff
		}
	}
}

async function scrapeZillow(zipCode) {
	const url = `https://www.zillow.com/homes/${zipCode}_rb/`;
	const browser = await puppeteer.launch({ headless: true });
	const page = await browser.newPage();
	await page.goto(url, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(5000);

	const listings = await page.evaluate(() => {
		const results = [];
		const cards = document.querySelectorAll(".list-card-info");
		for (const card of cards) {
			const address = card.querySelector("address")?.innerText || "N/A";
			const link = card.querySelector("a")?.href || "N/A";
			results.push({ address, link });
		}
		return results;
	});

	const fullData = [];

	for (const listing of listings) {
		const detailPage = await browser.newPage();
		try {
			const agentData = await tryScrapeDetailPage(detailPage, listing.link);
			fullData.push({
				address: listing.address,
				link: listing.link,
				agentName: agentData.name,
				phone: agentData.phone,
				email: agentData.email,
			});
		} catch (err) {
			console.error(`Error scraping listing: ${listing.link}`, err);
		}

		await detailPage.close();
	}

	await browser.close();
	return fullData;
}

module.exports = scrapeZillow;
