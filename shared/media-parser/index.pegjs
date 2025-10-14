// output format conforms to modal message;
// main for multiple-modal
// Entry point
start
  = (audio / link / htmlLink / htmlAudio / image / htmlImage / video / htmlVideo / url / codeBlock / text)+

htmlAttribute
  = _ name:("src"i / "alt"i / "href"i) _ "=" _ "\"" value:[^\"]+ "\"" {
      return { key:name.toLowerCase(), value: value.join("") };
    }

/* audio Definition */

// Markdown audio: [alt](#audio?url=src)
audio
  = "[" altText:[^\]]* "](#audio?url=" url:[^)]* ")" {
      return { type: "audio_url", audio_url: {title: altText.join(""), url: url.join("") }};
    }

// HTML <audio src="...">
htmlAudio
  = "<audio" atts:htmlAttribute+ _ "/>" {
      return { type: "audio_url", audio_url:{
          title: atts.find(a=>a.key=="alt")?.value, 
          url:  atts.find(a=>a.key=="src").value
        }};
    }

//link
link
  = "[" altText:[^\]]* "](" url:[^)]* ")" {
      return { type: "link", url: {title: altText.join(""), url: url.join("") }};
    }

//html link <a href=""></a>
htmlLink
  = "<a" _ "href" "=" "\"" url:[^\"]+ "\"" _ ">" altText:[^<]* "</a>" {
      return { type: "link", url:{title: altText.join(""), url: url.join("") }};
    }


/* Image Definitions */

// Markdown image: ![alt](src)
image
  = "![" altText:[^\]]* "](" url:[^)]* ")" {
      return { type: "image_url", image_url: {title: altText.join(""), url: url.join("") }};
    }

// HTML <img src="...">
htmlImage
  = "<img" atts:htmlAttribute+ _ "/>" {
      return { type: "image_url", image_url:{
        title: atts.find(a=>a.key=="alt")?.value, 
        url: atts.find(a=>a.key=="src")?.value
      }};
    }

/* Video Definitions */

// HTML <video src="...">
video
  = "<video" atts:htmlAttribute+ _ "/>" {
      return { type: "video_url", video_url: {url:atts.find(a=>a.key=="src")?.value }};
    }

// HTML <video><source></video>, supporting multiple <source> tags
htmlVideo
  = "<video" _ ">" _ sources:(sourceTag _)* _ "</video>" {
      return { type: "video_url", video_url: {url:sources.map(a=>a[0])[0] }};
    }

// <source src="..."> tag inside <video>
sourceTag
  = "<source" _ "src" "=" "\"" url:[^\"]+ "\"" _ "/>" {
      return url.join("")
    }

url
  = url:("http"i "s"i? "://" [^ \t\n\r]+) {
      const link=url.flat().join("")
      // check if link is image
      if(/\.(jpe?g|png|gif|bmp|webp|svg)$/i.test(link)) {
        return { type: "image_url", image_url: { url: link } };
      }
      // check if link is video
      if(/\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(link)) {
        return { type: "video_url", video_url: { url:link } };
      }
      return { type: "url", url: link };
    }

codeBlock
  = "```" lang:LangName? [ \t]* newline
    code:CodeContent
    "```" newline?
    {
      return {
        type: "code",
        lang: lang !== null ? lang : "plain",
        code: code
      };
    }

LangName
  = chars:[a-zA-Z0-9_]+ { return chars.join(""); }

CodeContent
  = lines:((!EndBacktick .)+ newline?)* {
      return lines.map(l => l.join("")).join("\n").split(",").join("");
    }

EndBacktick
  = "```"

newline
  = "\r\n" / "\n" / "\r"

/* Text Definition */

// Plain text (anything that is not a special tag like <img>, <video>, or ![...])
text
  = text:(
    [^\[<!h`] /
    "h"i !("ttp"i "s"i? "://"i) /
    "[" !([^\]]* "](") /
    "!" !("[" [^\]]* "](") /
    "<" !(("img"i / "video"i / "audio"i / "a"i) _) /
    "`" !("``" [^`]* "```")
    )+ {
      return { type: "text", text: text.flat().join("") };
    }

/* Whitespace and Ignored Characters */
_ = [ \t\n\r]*