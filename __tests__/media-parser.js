const { parse } = require("../shared/media-parser")

// Define test cases
describe('Peg.js Media Parser', () => {
    it('parses plain text', () => {
        const input = 'This is a plain text.';
        const expected = [{ type: 'text', text: 'This is a plain text.' }];
        expect(parse(input)).toEqual(expected);
    });

    it('parses Markdown link', () => {
        const input = '[Alt text](https://example.com/image.png)';
        const expected = [{ type: 'link',url:{title: 'Alt text', url: 'https://example.com/image.png' }}];
        expect(parse(input)).toEqual(expected);
    });

    it('parses html link', () => {
        const input = '<a href="https://example.com/image.png">Alt text</a>';
        const expected = [{ type: 'link',url:{title: 'Alt text', url: 'https://example.com/image.png' }}];
        expect(parse(input)).toEqual(expected);
    });

    it('parses url image', () => {
        const input = 'https://example.com/image.png';
        const expected = [{ type: 'image_url',image_url:{url:'https://example.com/image.png' }}];
        expect(parse(input)).toEqual(expected);
    });

    it('parses case-insensitive url video', () => {
        const input = 'hTTps://example.com/image.mp4';
        const expected = [{ type: 'video_url', video_url:{url:'hTTps://example.com/image.mp4' }}];
        expect(parse(input)).toEqual(expected);
    });

    it('parses url docx', () => {
        const input = 'https://example.com/document.docx';
        const expected = [{ type: 'url', url:'https://example.com/document.docx' }];
        expect(parse(input)).toEqual(expected);
    });


    it('parses Markdown audio', () => {
        const input = '[Alt text](#audio?url=https://example.com/image.png)';
        const expected = [{ type: 'audio_url',audio_url:{title: 'Alt text', url: 'https://example.com/image.png' }}];
        expect(parse(input)).toEqual(expected);
    });

    it('parses HTML audio', () => {
        const input = '<audio src="https://example.com/image.jpg" alt="An image" />';
        const expected = [{ type: 'audio_url', audio_url:{title: 'An image', url: 'https://example.com/image.jpg' }}];
        expect(parse(input)).toEqual(expected);
    });

    it('parses HTML audio[alt, src]', () => {
        const input = '<audio alt="An image" src="https://example.com/image.jpg" />';
        const expected = [{ type: 'audio_url', audio_url:{title: 'An image', url: 'https://example.com/image.jpg' }}];
        expect(parse(input)).toEqual(expected);
    });

    it('parses HTML audio[src]', () => {
        const input = '<audio src="https://example.com/image.jpg"/>';
        const expected = [{ type: 'audio_url', audio_url:{url: 'https://example.com/image.jpg' }}];
        expect(parse(input)).toEqual(expected);
    });

    it('parses HTML audio[]', () => {
        const input = '<audio/>';
        const expected = [{ type: 'audio_url', audio_url:{}}];
        expect(()=>parse(input)).toThrow()
    });

    it('parses Markdown image', () => {
        const input = '![Alt text](https://example.com/image.png)';
        const expected = [{ type: 'image_url',image_url:{title: 'Alt text', url: 'https://example.com/image.png' }}];
        expect(parse(input)).toEqual(expected);
    });

    it('parses HTML image', () => {
        const input = '<img src="https://example.com/image.jpg" alt="An image" />';
        const expected = [{ type: 'image_url', image_url:{title: 'An image', url: 'https://example.com/image.jpg' }}];
        expect(parse(input)).toEqual(expected);
    });

    it('parses HTML video with single source', () => {
        const input = '<video src="https://example.com/video.mp4" />';
        const expected = [{ type: 'video_url', video_url: {url:'https://example.com/video.mp4' }}];
        expect(parse(input)).toEqual(expected);
    });

    it("hello [ world", ()=>{
        expect(parse("hello [ world")).toEqual([{type:"text", text:"hello [ world"}])
    })


    it('text, url, text', () => {
        const input = 'good htTps://a.com day';
        const expected = [
            { type: 'text', text: 'good ' }, 
            {type:"url", url: "htTps://a.com"}, 
            {type:"text", text:" day"}
        ];
        expect(parse(input)).toEqual(expected);
    });

    it("text <img", ()=>{
        const input=`good <img src="https://a.com" alt="x"/>`
        const expected = [
            { type: 'text', text: 'good ' }, 
            {type:"image_url", image_url: {url:"https://a.com", title:"x"}}
        ];
        expect(parse(input)).toEqual(expected);
    })

    // it('parses HTML video with multiple sources', () => {
    //     const input = `<video>
    //             <source src="https://example.com/video1.mp4" />
    //             <source src="https://example.com/video2.webm" />
    //         </video>`;
    //     const expected = [{
    //         type: 'video_url',
    //         video_url: ['https://example.com/video1.mp4', 'https://example.com/video2.webm' ]
    //     }];
    //     expect(parse(input)).toEqual(expected);
    // });

    it("``` codeblock", ()=>{
        expect(parse("```js\nlet name='hello';```")).toMatchObject([{type:"code", lang:"js", code:"let name='hello';"}])
    })

    it("``` codeblock", ()=>{
        expect(parse("```js\nlet name='hello';\nlet first='li';\n```")).toMatchObject([{type:"code", lang:"js", code:"let name='hello';\nlet first='li';\n"}])
    })

    it('parses mixed content', () => {
        const input = `Some introduction text.

![Alt text](https://example.com/image.png)

More text here.

<img src="https://example.com/image2.jpg" alt="Another image" />

Here is a video:

<video>
  <source src="https://example.com/video1.mp4" />
</video>

Conclusion text. 

[hello](#audio?url=https://example.com/image2.jpg)

<audio src="http://a.com/a.mp3" alt="hello"/>

\`\`\`js
let name='test';
\`\`\`

`;
        const expected = [

            { type: 'text', text: 'Some introduction text.\n\n' },
            { type: 'image_url', image_url:{title: 'Alt text', url: 'https://example.com/image.png' }},
            { type: 'text', text: '\n\nMore text here.\n\n' },
            { type: 'image_url', image_url:{title: 'Another image', url: 'https://example.com/image2.jpg' }},
            { type: 'text', text: '\n\nHere is a video:\n\n' },
            { type: 'video_url',video_url: {url:'https://example.com/video1.mp4'}},
            { type: 'text', text: '\n\nConclusion text. \n\n' },
            
            { type: 'audio_url', audio_url: {url:"https://example.com/image2.jpg", title:"hello"}},
            { type: 'text', text: '\n\n' },
            { type: 'audio_url', audio_url: {url:"http://a.com/a.mp3", title:"hello"}},
            { type: 'text', text: '\n\n' },
            { type: 'code', lang:'js', code:"let name='test';\n"}, 
            { type: 'text', text: '\n' },
            
        ];
        const parsed=parse(input)
        expect(parsed.length).toBe(expected.length)
        expect(parsed).toMatchObject(expected);
    });
});
