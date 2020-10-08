// const someOtherHostname = "my.herokuapp.com"

async function handleRequest(event) {
  try {
    
    const request = event.request
    const cacheUrl = new URL(request.url)
  
    // Hostname for a different zone
    // cacheUrl.hostname = someOtherHostname
  
    // const cacheKey = new Request(cacheUrl.toString(), request)
    const cacheKey = new Request(cacheUrl.toString());
    const cache = caches.default;
  
    // return new Response(JSON.stringify(cache));
    // Get this request from this zone's cache
    let response = await cache.match(cacheKey);
  
    if (!response) {
  
      // Must use Response constructor to inherit all of response's fields
      response = new Response(`Not cached`);
  
    }
    return response

  } catch (err) {
    return new Response(`Error: ${err.message}`);
  }

}

async function handlePostRequest(event) {
  try {
    
    const request = event.request
    const body = await request.clone().text()
    const cacheUrl = new URL(request.url)

    cacheUrl.pathname = "/posts" + cacheUrl.pathname

    // Convert to a GET to be able to cache
    const cacheKey = new Request(cacheUrl.toString(), {
      // don't set the headers, or it won't work
      method: "GET",
    })

    const cache = caches.default;

    let response = new Response(JSON.stringify({
      body,
      updated: new Date(),
    }), {

    });
    
    try {
      await cache.put(cacheKey, response);
      // return new Response(`Added to cache for ${cacheKey.url}`);
    } catch (err) {
      return new Response(`Failed to put in cache!`);
    }

    return new Response(`cacheKey: ${JSON.stringify(cacheKey)}, cache value: ${JSON.stringify(await cache.match(cacheKey))}`);
    response = await cache.match(cacheKey);
    return response;

    if (response) {
      return response;
    } else {
      return new Response(`Failed! Url was ${cacheKey.url}`);
    }
    
    return new Response(`Added to cache! GET path: ${cacheUrl.pathname}`);
    
  } catch (err) {
    return new Response(`Error: ${err.message}`);
  }
  
}

addEventListener("fetch", event => {
  try {
    const request = event.request
    if (request.method.toUpperCase() === "POST") {

      return event.respondWith(handlePostRequest(event))
      
    }
    // return event.respondWith(new Response(`Success`));
    return event.respondWith(handleRequest(event))
  } catch (e) {
    return event.respondWith(new Response("Error thrown " + e.message))
  }
})