// load the matching redirect response from the cache
async function handleRequest(event) {
  try {
    
    const request = event.request
    let cacheUrl = new URL(request.url)
    cacheUrl.hash = ``;
    cacheUrl.search = ``;
  
    const cacheKey = new Request(cacheUrl.toString());
    const cache = caches.default;
  
    // return new Response(JSON.stringify(cache));
    // Get this request from this zone's cache
    let response = await cache.match(cacheKey);
  
    if (!response) {
      response = new Response(`Not cached`, {
        headers: {
          'Access-Control-Allow-Origin': new URL(request.url).origin,
        }
      });
    }
    return response

  } catch (err) {
    return new Response(`Error: ${err.message}`, {
      headers: {
        'Access-Control-Allow-Origin': new URL(request.url).origin,
      }
    });
  }
}

async function handlePostRequest(event) {
  try {
    
    const request = event.request
    const body = await request.clone().text()
    // let cacheUrl = new URL(request.url);
    // cacheUrl.hash = ``;
    // cacheUrl.search = ``;
    let urlWithoutHash = request.url.split('#')[0];
    let redirectCacheUrl = new URL(urlWithoutHash);
    redirectCacheUrl.pathname = ``;
    redirectCacheUrl.search = ``;

    // // Convert to a GET to be able to cache
    // const cacheKey = new Request(request.url, {
    //   // don't set the headers, or it won't work
    //   method: "GET",
    // })
    // Convert to a GET to be able to cache
    const redirectCacheKey = new Request(redirectCacheUrl.toString(), {
      // don't set the headers, or it won't work
      method: "GET",
    })

    const cache = caches.default;

    // let response = new Response(JSON.stringify({
    //   body,
    //   updated: new Date(),
    // }), {

    // });

    // save redirect url in body of response
    let redirectResponse = new Response(new URL(body).hostname);
    
    try {
      // await cache.put(cacheKey, response);
      await cache.put(redirectCacheKey, redirectResponse);
      // return new Response(`Added to cache for ${cacheKey.url}`);
    } catch (err) {
      return new Response(`Failed to put in cache!`);
    }

    response = await cache.match(redirectCacheKey);

    if (response) {
      return new Response(`Added to cache!`, {
        headers: {
          'Access-Control-Allow-Origin': new URL(request.url).origin,
          // 'debug': `Body: ${JSON.stringify(body)}`,
        }
      });
    } else {
      return new Response(`Failed! Url was ${redirectCacheKey.url}`, {
        headers: {
          'Access-Control-Allow-Origin': new URL(request.url).origin,
        }
      });
    }
    
  } catch (err) {
    return new Response(`Error: ${err.message}`, {
      headers: {
        'Access-Control-Allow-Origin': new URL(request.url).origin,
      }
    });
  }
  
}

async function handleRedirectRequest(event) {
  try {
    
    const request = event.request
    let urlWithoutHash = request.url.split('#')[0];
    let redirectCacheUrl = new URL(urlWithoutHash);
    redirectCacheUrl.pathname = ``;
    redirectCacheUrl.search = ``;
    
    const redirectCacheKey = new Request(redirectCacheUrl.toString());
    const cache = caches.default;
    
    
    // return new Response(JSON.stringify(cache));
    // Get this request from this zone's cache
    let response = await cache.match(redirectCacheKey);
    
    if (!response) {
      return new Response(`Redirect url not set`, {
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': new URL(request.url).origin,
        }
      });
    }
    
    let fullRedirectUrl = new URL(request.url);
    // don't override the port
    // THIS MEANS THAT WHEN SETTING THE REDIRECT URL, DON'T PROVIDE A PORT!
    fullRedirectUrl.hostname = await response.clone().text(); // the body of the response contains the hostname of the redirect url
    
    // return new Response(`test4`);
    return new Response(``, {
      status: 302,
      headers: {
        'Access-Control-Allow-Origin': new URL(request.url).origin,
        'Location': fullRedirectUrl.toString(),
        // 'Debug': `${fullRedirectUrl.toString()}`,
        'Debug': `${JSON.stringify(response)}`,
        // 'Location': JSON.stringify(response.body),
      }
    });

  } catch (err) {
    return new Response(`Error: ${err.message}`, {
      headers: {
        'Access-Control-Allow-Origin': new URL(request.url).origin,
      }
    });
  }
}

addEventListener("fetch", event => {
  try {
    const request = event.request
    // return event.respondWith(new Response(`Caught by worker! ${new URL(request.url).hostname.split(`.`)[0]}`));
    let specialHeaderIncluded = event.request.headers.get(`X-Chaphasilor-Redirect`);

    if (request.method.toUpperCase() === `OPTIONS`) {
      return event.respondWith(new Response(undefined, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': new URL(request.url).origin,
          'Access-Control-Allow-Methods': `CONNECT, DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT, TRACE`,
          'Access-Control-Allow-Headers': [...request.headers.entries()].reduce((sum, pair, index) => {
            return index === 0 ? pair[0] : `${sum}, ${pair[0]}`;
          }, ``),
        }
      }))
    }
    
    if (specialHeaderIncluded) {
      if (request.method.toUpperCase() === "POST") {
        return event.respondWith(handlePostRequest(event))
      } else if (request.method.toUpperCase() === "GET") {
        return event.respondWith(handleRequest(event)) //TODO only return the urls here (create a new function)
      } else {
        return event.respondWith(new Response(`Method not allowed!`, {
          status: 405,
          headers: {
            'Access-Control-Allow-Origin': new URL(request.url).origin,
          }
        }))
      }

    } else {
      return event.respondWith(handleRedirectRequest(event)) // return a 302 with the corresponding location header (response is already in the cache, just use the right cacheKey)
    }
  } catch (e) {
    return event.respondWith(new Response("Error thrown " + e.message, {
      headers: {
        'Access-Control-Allow-Origin': new URL(request.url).origin,
      }
    }))
  }
})