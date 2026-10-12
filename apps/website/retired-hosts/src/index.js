export default {
  async fetch() {
    return new Response("gone\n", {
      status: 410,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=300"
      }
    });
  }
};
