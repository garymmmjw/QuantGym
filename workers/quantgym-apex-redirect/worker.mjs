const TARGET_HOST = "beta.quantgym.app";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.hostname = TARGET_HOST;
    return Response.redirect(url.toString(), 302);
  }
};
