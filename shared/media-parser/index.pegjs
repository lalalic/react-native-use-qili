// output format conforms to modal message;
// main for multiple-modal
// Entry point
start
  = (audio / link / htmlLink / htmlAudio / image / htmlImage / video / htmlVideo / text)+

/* audio Definition */

// Markdown audio: [alt](#audio?url=src)
audio
  = "[" altText:[^\]]* "](#audio?url=" url:[^)]* ")" {
      return { type: "audio_url", audio_url: {title: altText.join(""), url: url.join("") }};
    }

// HTML <audio src="...">
htmlAudio
  = "<audio" _ "src" "=" "\"" url:[^\"]+ "\"" _ "alt" "=" "\"" altText:[^\"]+ "\"" _ "/>" {
      return { type: "audio_url", audio_url:{title: altText.join(""), url: url.join("") }};
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
  = "<img" _ "src" "=" "\"" url:[^\"]+ "\"" _ "alt" "=" "\"" altText:[^\"]+ "\"" _ "/>" {
      return { type: "image_url", image_url:{title: altText.join(""), url: url.join("") }};
    }

/* Video Definitions */

// HTML <video src="...">
video
  = "<video" _ "src" "=" "\"" url:[^\"]+ "\"" _ "/>" {
      return { type: "video", video: url.join("") };
    }

// HTML <video><source></video>, supporting multiple <source> tags
htmlVideo
  = "<video" _ ">" _ sources:(sourceTag _)* _ "</video>" {
      return { type: "video", video: sources.map(a=>a[0]) };
    }

// <source src="..."> tag inside <video>
sourceTag
  = "<source" _ "src" "=" "\"" url:[^\"]+ "\"" _ "/>" {
      return url.join("")
    }

/* Text Definition */

// Plain text (anything that is not a special tag like <img>, <video>, or ![...])
text
  = text:[^!<]+ {
      return { type: "text", text: text.join("").trim() };
    }

/* Whitespace and Ignored Characters */
_ = [ \t\n\r]*