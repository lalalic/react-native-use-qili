// output format conforms to modal message;
// main for multiple-modal
// Entry point
start
  = ( image / htmlImage / video / htmlVideo / text)+

htmlAttribute
  = _ name:("src"i / "alt"i / "href"i) _ "=" _ "\"" value:[^\"]+ "\"" {
      return { key:name.toLowerCase(), value: value.join("") };
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

/* Text Definition */

// Plain text (anything that is not a special tag like <img>, <video>, or ![...])
text
  = text:(
    [^<!] /
    "!" !("[" [^\]]* "](") /
    "<" !(("img"i / "video"i / "source"i ) _) 
    )+ {
      return { type: "text", text: text.flat().join("") };
    }

/* Whitespace and Ignored Characters */
_ = [ \t\n\r]*