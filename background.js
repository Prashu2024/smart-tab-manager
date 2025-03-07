// Import browser polyfill if needed
// import browser from 'webextension-polyfill';

// Store for our tab data
let tabData = {};

// Function to fetch page content from a tab
async function getPageContent(tabId) {
  try {
    // Get tab information first
    const tab = await chrome.tabs.get(tabId);
    
    // Handle special URLs and inaccessible pages
    if (!tab.url || 
        tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('edge://') ||
        tab.url.startsWith('about:') ||
        tab.url.startsWith('chrome-search://') ||
        tab.url.startsWith('view-source:') ||
        tab.url.startsWith('file:')) {
      return {
        title: tab.title || "",
        metaDescription: "",
        bodyText: ""
      };
    }

    // For regular web pages, try to execute the content script
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId, allFrames: false },
        func: () => {
          // Get page title, meta description, and visible text
          const title = document.title;
          const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
          
          // Get main content text (basic implementation)
          const bodyText = document.body?.innerText?.substring(0, 1000) || ''; // First 1000 chars
          
          return { title, metaDescription, bodyText };
        }
      });
      
      if (!result || !result[0]) {
        throw new Error('No result from executeScript');
      }

      return result[0].result;
    } catch (scriptError) {
      console.log(`Script execution failed for ${tab.url}, falling back to basic info:`, scriptError);
      // Fall back to basic tab information if script execution fails
      return {
        title: tab.title || "",
        metaDescription: "",
        bodyText: `[Content not accessible] - ${tab.url}`
      };
    }
  } catch (error) {
    console.error(`Error getting content from tab ${tabId}:`, error);
    
    // Try to at least get the tab title as a last resort
    try {
      const tab = await chrome.tabs.get(tabId);
      return {
        title: tab.title || "",
        metaDescription: "",
        bodyText: `[Tab information unavailable]`
      };
    } catch (e) {
      return {
        title: "Unknown Tab",
        metaDescription: "",
        bodyText: "[Tab information unavailable]"
      };
    }
  }
}

const rules = [
  {
    category: "Development",
    keywords: [
      "github.com", "gitlab.com", "bitbucket.org", "stackoverflow.com",
      "codepen.io", "jsfiddle.net", "codesandbox.io", "w3schools.com",
      "developer.mozilla.org", "freecodecamp.org", "codecademy.com",
      "hackerrank.com", "leetcode.com", "geeksforgeeks.org", "dev.to",
      "npmjs.com", "packagist.org", "rubygems.org", "docker.com",
      "kubernetes.io", "jenkins.io", "travis-ci.org", "circleci.com",
      "aws.amazon.com", "azure.microsoft.com", "cloud.google.com",
      "digitalocean.com", "heroku.com", "netlify.com", "vercel.com",
      "firebase.google.com", "supabase.io", "strapi.io", "graphql.org",
      "apollographql.com", "postman.com", "swagger.io", "insomnia.rest",
      "jestjs.io", "mochajs.org", "cypress.io", "selenium.dev",
      "puppeteer.dev", "webdriver.io", "karma-runner.github.io",
      "eslint.org", "prettier.io", "stylelint.io", "babeljs.io",
      "webpack.js.org", "rollupjs.org", "parceljs.org", "vitejs.dev",
      "gulpjs.com", "gruntjs.com", "browserify.org", "typescriptlang.org",
      "flow.org", "reasonml.github.io", "elm-lang.org", "clojurescript.org",
      "purescript.org", "scala-lang.org", "kotlinlang.org", "dart.dev",
      "rust-lang.org", "golang.org", "python.org", "ruby-lang.org",
      "perl.org", "php.net", "laravel.com", "symfony.com", "codeigniter.com",
      "cakephp.org", "zend.com", "drupal.org", "joomla.org", "wordpress.org",
      "magento.com", "shopify.com", "bigcommerce.com", "salesforce.com",
      "sap.com", "oracle.com", "microsoft.com", "ibm.com", "redhat.com",
      "canonical.com", "debian.org", "ubuntu.com", "centos.org",
      "fedora.org", "archlinux.org", "gentoo.org", "slackware.com",
      "linuxmint.com", "elementary.io", "manjaro.org", "opensuse.org",
      "freebsd.org", "netbsd.org", "openbsd.org", "haiku-os.org",
      // Global Cloud Service Providers
      "aws.amazon.com", "awsapps.com", // Amazon Web Services
      "azure.microsoft.com", // Microsoft Azure
      "cloud.google.com", // Google Cloud Platform
      "oracle.com/cloud", // Oracle Cloud
      "ibm.com/cloud", // IBM Cloud
      "alibabacloud.com", // Alibaba Cloud
      "cloud.tencent.com", // Tencent Cloud
      "digitalocean.com", // DigitalOcean
      "kamatera.com", // Kamatera
      "linode.com", // Linode (by Akamai)
      "ovhcloud.com", // OVHcloud
    ]
  },
  {
    category: "Documents",
    keywords: [
      "docs.google.com", "notion.so", "dropbox.com", "onedrive.live.com",
      "box.com", "icloud.com", "evernote.com", "zoho.com", "quip.com",
      "slite.com", "coda.io", "airtable.com", "confluence.atlassian.com",
      "sharepoint.com", "scribd.com", "slideshare.net", "issuu.com",
      "docdroid.net", "calameo.com", "yumpu.com", "edocr.com",
      "mediafire.com", "4shared.com", "megaupload.com", "rapidshare.com",
      "zippyshare.com", "sendspace.com", "wetransfer.com", "transfernow.net",
      "pcloud.com", "sync.com", "idrive.com", "sugarsync.com",
      "spideroak.com", "egnyte.com", "owncloud.org", "nextcloud.com",
      "alfresco.com", "m-files.com", "filecloud.com", "onlyoffice.com",
      "polarisoffice.com", "libreoffice.org", "openoffice.org",
      "apache.org", "latex-project.org", "overleaf.com", "authorea.com",
      "sharelatex.com", "papersapp.com", "mendeley.com", "zotero.org",
      "refworks.com", "endnote.com", "citavi.com", "readcube.com",
      "paperpile.com", "researchgate.net", "academia.edu", "jstor.org",
      "springer.com", "sciencedirect.com", "nature.com", "wiley.com",
      "tandfonline.com", "cambridge.org", "oup.com", "sagepub.com",
      "informa.com", "emerald.com", "degruyter.com", "hindawi.com",
      "mdpi.com", "plos.org", "biorxiv.org", "arxiv.org", "ssrn.com",
      "repec.org", "ideas.repec.org", "nber.org", "cepr.org",
      "voxeu.org", "econpapers.repec.org", "journals.sagepub.com",
      "annualreviews.org", "mitpressjournals.org", "pnas.org",
      "sciencemag.org", "cell.com", "thelancet.com", "bmj.com",
      "jamanetwork.com", "nejm.org", "thelancet.com", "bmj.com"
    ]
  },
  {
    category: "Email",
    keywords: [
      "mail.google.com", "outlook.live.com", "mail.yahoo.com", "mail.aol.com",
      "protonmail.com", "zoho.com/mail", "icloud.com/mail", "gmx.com",
      "yandex.com/mail", "mail.com", "fastmail.com", "hushmail.com",
      "tutanota.com", "runbox.com", "posteo.de", "mailfence.com",
      "startmail.com", "countermail.com", "lavabit.com", "riseup.net",
      "disroot.org", "openmailbox.org", "mailpile.is", "kolabnow.com",
      "migadu.com", "mailbox.org", "mail.ru", "rambler.ru", "bk.ru",
      "inbox.ru", "list.ru", "qq.com", "163.com", "126.com", "sina.com",
      "sohu.com", "yeah.net", "aliyun.com", "tom.com", "21cn.com",
      "139.com", "189.cn", "wo.com.cn", "naver.com", "daum.net",
      "nate.com", "hanmail.net", "kakao.com", "mail.kz", "mail.ee",
      "mail.bg", "abv.bg", "dir.bg", "mail.ru", "yandex.ru", "ukr.net",
      "i.ua", "meta.ua", "bigmir.net", "freemail.hu", "citromail.hu",
      "mail.gr", "otenet.gr", "yahoo.co.jp", "mail.goo.ne.jp", "excite.co.jp",
      "nifty.com", "infoseek.co.jp", "lycos.com"
    ]
  },
  {
    category: "Entertainment",
    keywords: [
      "youtube.com", "netflix.com", "hulu.com", "primevideo.com", "disneyplus.com",
      "hbomax.com", "apple.com/tv", "vudu.com", "crunchyroll.com", "funimation.com",
      "spotify.com", "soundcloud.com", "deezer.com", "tidal.com", "pandora.com",
      "iheartradio.com", "audible.com", "twitch.tv", "kick.com", "dailymotion.com",
      "vimeo.com", "tiktok.com", "snapchat.com", "9gag.com", "imgur.com",
      "giphy.com", "memedroid.com", "newgrounds.com", "kongregate.com",
      "miniclip.com", "roblox.com", "epicgames.com", "steampowered.com",
      "store.playstation.com", "xbox.com", "nintendo.com", "gamejolt.com",
      "itch.io", "pogo.com", "armor-games.com", "addictinggames.com",
      "poki.com", "crazygames.com", "rockstargames.com", "ea.com",
      "ubisoft.com", "blizzard.com", "riotgames.com", "valorant.com",
      "leagueoflegends.com", "fortnite.com", "callofduty.com",
      "minecraft.net", "terraria.org", "fifa.com", "nba.com",
      "mlb.com", "nfl.com", "ufc.com", "espn.com", "bleacherreport.com",
      "cbssports.com", "foxsports.com", "sports.yahoo.com", "barstoolsports.com",
      "betway.com", "draftkings.com", "fanduel.com", "pokerstars.com",
      "chess.com", "lichess.org", "boardgamegeek.com", "tabletopia.com",
      "roll20.net", "disney.com", "marvel.com", "dc.com",
      "indiewire.com", "rottentomatoes.com", "metacritic.com", "imdb.com",

      "hotstar.com", "sonyliv.com", "zee5.com", "voot.com", "altbalaji.com",
      "erosnow.com", "aha.video", "sunnxt.com", "hoichoi.tv", "mxplayer.in",
      "jiocinema.com", "tataplay.com", "airtelxstream.in", "hungama.com",
      "wynk.in", "saavn.com", "gaana.com", "bollywoodhungama.com", 
      "koimoi.com", "filmfare.com", "indiaglitz.com", "pinkvilla.com",
      "thequint.com/entertainment", "thehindu.com/entertainment", 
      "hindustantimes.com/entertainment", "indiatoday.in/movies", 
      "dnaindia.com/entertainment", "newindianexpress.com/entertainment",
      "timesofindia.indiatimes.com/entertainment", "spotboye.com",
      "tellychakkar.com", "desimartini.com", "mirchiplay.com",
      "cinestaan.com", "cinemaexpress.com", "cinejosh.com",
      "movierulz.com", "123movies.fun", "bollymoviereviewz.com",
      "tollywood.net", "tamilrockers.ws", "moviemirchi.com",
      "rajbet.com", "manoramamax.com", "boxofficeindia.com",
      "indianshowbiz.com", "bollywoodlife.com", "fameindia.in",
      "cinetalkers.com", "popxo.com/entertainment", "peepingmoon.com"
    ]
  },
  {
    category: "Reading",
    keywords: [
      "news.google.com", "bbc.com", "cnn.com", "nytimes.com", "washingtonpost.com",
      "theguardian.com", "bloomberg.com", "reuters.com", "forbes.com",
      "businessinsider.com", "cnbc.com", "marketwatch.com", "wsj.com",
      "ft.com", "hbr.org", "theatlantic.com", "vox.com", "slate.com",
      "politico.com", "npr.org", "economist.com", "nationalgeographic.com",
      "smithsonianmag.com", "time.com", "newyorker.com", "scientificamerican.com",
      "popsci.com", "wired.com", "arstechnica.com", "engadget.com",
      "techcrunch.com", "theverge.com", "9to5mac.com", "macrumors.com",
      "gizmodo.com", "lifehacker.com", "medium.com", "substack.com",
      "blogspot.com", "wordpress.com", "tumblr.com", "quora.com",
      "reddit.com/r/news", "reddit.com/r/worldnews", "reddit.com/r/politics",
      "longreads.com", "lithub.com", "goodreads.com", "bookbub.com",
      "kobo.com", "barnesandnoble.com", "audible.com", "archive.org",
      "gutenberg.org", "openlibrary.org", "hn.algolia.com", "theinformation.com",
      "propublica.org", "fivethirtyeight.com", "theintercept.com",
      "apnews.com", "upi.com", "vice.com", "msnbc.com", "aljazeera.com",
      "dw.com", "rt.com", "straitstimes.com", "japantimes.co.jp",
      "chinadaily.com.cn", "thehindu.com", "indiatoday.in", "hindustantimes.com",
      "indiatimes.com", "abcnews.go.com", "cbc.ca", "globalnews.ca",
      "theage.com.au", "smh.com.au", "nzherald.co.nz", "france24.com",
      "lemonde.fr", "elpais.com", "corriere.it", "sueddeutsche.de",
      "spiegel.de", "bild.de", "bbc.co.uk",

      "timesofindia.indiatimes.com", "indiatoday.in", "thehindu.com",
      "hindustantimes.com", "ndtv.com", "theprint.in", "scroll.in",
      "firstpost.com", "thequint.com", "news18.com", "deccanherald.com",
      "dnaindia.com", "thewire.in", "newindianexpress.com", "livemint.com",
      "business-standard.com", "moneycontrol.com", "financialexpress.com",
      "zeenews.india.com", "oneindia.com", "manoramaonline.com",
      "mathrubhumi.com", "sakshi.com", "theweek.in", "thetribuneindia.com",
      "opindia.com", "asianage.com", "telanganatoday.com", "bangaloremirror.indiatimes.com",
      "navbharattimes.indiatimes.com", "lokmat.com", "sakaltimes.com",
      "dailypioneer.com", "deccanchronicle.com", "pragativadi.com",
      "anandabazar.com", "amarujala.com", "jagran.com", "dainikbhaskar.com",
      "patrika.com", "divyabhaskar.co.in", "samayam.com", "malayalam.samayam.com",
      "eisamay.com", "madhyamam.com", "asomiyapratidin.in", "uttarbangasambad.com",
      "orissapost.com", "kashmirtimes.com", "dailyexcelsior.com",
      "telugunews18.com", "vijaykarnataka.com", "kannadaprabha.com",
      "suvarna.com", "sakshieducation.com", "teluguglobal.com",
      "prajasakti.com", "e-pao.net", "northeasttoday.in", "sentinelassam.com",
      "ifp.co.in", "nagalandpost.com", "morungexpress.com", "arunachaltimes.in",
      "meghalayatimes.info", "manipurtimes.com", "hornbilltv.com"
    ]
  },
  {
    category: "Social Media",
    keywords: [
      // Global Social Media Platforms
      "facebook.com", "instagram.com", "twitter.com", "x.com", "tiktok.com",
      "linkedin.com", "reddit.com", "pinterest.com", "snapchat.com", 
      "tumblr.com", "quora.com", "discord.com", "twitch.tv", 
      "clubhouse.com", "threads.net", "mastodon.social", "peertube.org",
      "mewe.com", "ello.co", "gab.com", "parler.com", "gettr.com",
      "truthsocial.com", "nextdoor.com", "wechat.com", "qq.com", 
      "weibo.com", "douyin.com", "bilibili.com", "vk.com", 
      "ok.ru", "line.me", "viber.com", "kakaotalk.com",
  
      // Indian Social Media & Short Video Platforms
      "sharechat.com", "mojapp.in", "charmboard.com", "takatak.com",
      "mitron.tv", "chingaari.com", "joshapp.com", "roposo.com",
      "hike.in", "kooting.com", "loktantra.live", "tangobuzz.com",
      "kooapp.com", "wekut.com", "tooter.in", "samosaapp.com",
      "bhimchat.com", "famefox.com", "boodmo.com", "bolindia.com",
      "boloindya.com", "kumbhapp.com",
  
      // Professional & Business Networks
      "linkedin.com", "xing.com", "viadeo.com", "angel.co", 
      "meetup.com", "shapr.co", "guild.co", "opprtunity.com",
  
      // Niche & Alternative Social Networks
      "deviantart.com", "artstation.com", "dribbble.com", 
      "behance.net", "letterboxd.com", "goodreads.com",
      "last.fm", "soundcloud.com", "mixcloud.com", 
      "reverbnation.com", "bandcamp.com", "alltrails.com",
      "couchsurfing.com", "gaiaonline.com", "myanimelist.net",
      "anime-planet.com", "pixiv.net", "fanfiction.net",
      "archiveofourown.org", "wattpad.com", "figment.com",
      "tiktok.com", "byte.co", "dubsmash.com", "funimate.com",
      "triller.co", "bigo.tv",
  
      // Online Discussion Forums & Q&A Sites
      "quora.com", "reddit.com", "stackexchange.com", 
      "stackoverflow.com", "ask.fm", "curiouscat.me",
      "4chan.org", "8kun.top", "anonib.com", "topix.com",
      "disqus.com", "forumotion.com", "proboards.com",
      "vbulletin.com", "tapatalk.com",
  
      // Live Streaming & Video Sharing Communities
      "twitch.tv", "dailymotion.com", "kick.com", "periscope.tv",
      "vimeo.com", "odysee.com", "rumble.com", "bitchute.com",
      "veoh.com", "metacafe.com", "liveleak.com", "ustream.tv",
  
      // Dating & Social Discovery
      "tinder.com", "bumble.com", "okcupid.com", "plentyoffish.com",
      "match.com", "hinge.co", "grindr.com", "her.com", "feeld.co",
      "badoo.com", "coffeemeetsbagel.com", "skout.com", "meetme.com",
      "happn.com", "tagged.com", "ashleymadison.com", "raya.com",
      "mocospace.com", "swinglifestyle.com", "zoosk.com",
  
      // Privacy-Focused & Decentralized Social Networks
      "mastodon.social", "diasporafoundation.org", "scuttlebutt.nz",
      "peertube.org", "friendica.com", "gnu.io/social", "movim.eu",
      "d.tube", "farcaster.xyz", "nostr.net", "matrix.org",
  
      // Messaging & Communication Apps
      "telegram.org", "whatsapp.com", "signal.org", "element.io",
      "wechat.com", "line.me", "viber.com", "skype.com",
      "kik.com", "bbm.com", "imo.im", "zalo.me", "chitchat.com",
      "icq.com", "threema.ch", "ring.cx", "tamtam.chat"
    ]
  },
  {
    category: "LLM Chatbots",
    keywords: [
      // OpenAI's ChatGPT
      "chat.openai.com", "openai.com/chatgpt", "chatgpt.com",
  
      // Anthropic's Claude
      "claude.ai", "anthropic.com/claude",
  
      // xAI's Grok
      "x.ai/grok", "grok.ai",
  
      // Google's Gemini
      "bard.google.com", "gemini.google.com",
  
      // Microsoft's Copilot
      "copilot.microsoft.com", "bing.com/chat",
  
      // Meta's LLaMa
      "llama.meta.com", "ai.facebook.com/llama",
  
      // Perplexity AI
      "perplexity.ai",
  
      // HuggingChat by Hugging Face
      "huggingface.co/chat", "huggingchat.com",
  
      // DeepSeek
      "deepseek.ai",
  
      // Other notable LLM chatbots
      "you.com/chat", "palm.google.com", "alexa.amazon.com", "siri.apple.com"
    ]
  }
  
  
];

async function getCategory(url) {
  for (let { category, keywords } of rules) {
    if (keywords.some(keyword => url.includes(keyword))) {
      return category;
    }
  }
  return "Uncategorized";
}



// Function to analyze and categorize a tab
async function analyzeTab(tab) {
  const { id, url, title } = tab;
  
  // Skip special browser pages, settings, etc.
  if (!url || url.startsWith('chrome:') || url.startsWith('chrome-extension:') || url.startsWith('about:')) {
    return;
  }
  
  // Get page content
  const content = await getPageContent(id);
  
  // In a real implementation, here you would:
  // 1. Call an LLM API to categorize/summarize the tab content
  // For the prototype, we'll use a simple categorization based on URL/title
  
  let category = await getCategory(url);
  
  // Generate a basic summary (replace with LLM in production)
  const summary = content.title ? content.title : "No summary available";
  
  // Store the tab data
  tabData[id] = {
    id,
    url,
    title,
    category,
    summary,
    lastAccessed: new Date().getTime(),
    content: content
  };
  
  // Save to storage for persistence
  chrome.storage.local.set({ tabData });
  
  // Try to send a message to the popup, but handle the error if popup isn't open
  try {
    // Attempt to notify popup if it's open
    chrome.runtime.sendMessage({ action: "tabAnalyzed", tabId: id })
      .catch(error => {
        // Suppress the error about receiving end not existing
        console.log("Popup not available for message, this is normal");
      });
  } catch (error) {
    // Suppress any errors related to messaging
    console.log("Error sending message to popup, this is normal if popup is closed");
  }
}

// Listen for tab events
chrome.tabs.onCreated.addListener(async (tab) => {
  await analyzeTab(tab);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    await analyzeTab(tab);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const { tabId } = activeInfo;
  
  if (tabData[tabId]) {
    tabData[tabId].lastAccessed = new Date().getTime();
    chrome.storage.local.set({ tabData });
  }
  
  const tab = await chrome.tabs.get(tabId);
  await analyzeTab(tab);
});

// On extension startup, analyze all existing tabs
chrome.runtime.onStartup.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    await analyzeTab(tab);
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    await analyzeTab(tab);
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getTabData") {
    sendResponse({ tabData });
  } else if (message.action === "analyzeSingleTab") {
    // Analyze a single tab
    const tabId = message.tabId;
    analyzeTab(chrome.tabs.get(tabId));
    sendResponse({ success: true });
  } else if (message.action === "closeTabs") {
    const { tabIds } = message;
    for (const tabId of tabIds) {
      chrome.tabs.remove(tabId);
      delete tabData[tabId];
    }
    chrome.storage.local.set({ tabData });
    sendResponse({ success: true });
  } else if (message.action === "groupTabs") {
    // In Manifest V3, we need to implement tab grouping differently
    // This is a placeholder for tab grouping functionality
    sendResponse({ success: true });
  }
  
  return true; // Required for async response
});
