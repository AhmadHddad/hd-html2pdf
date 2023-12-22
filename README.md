# hd-html2pdf

Just like html2pdf on the web, this NodeJs tool can convert any url or html into a pdf file.
Its a drop and use with default configs to get you up and running.

## Getting Started

`
import hdHtml2Pdf from 'hd-html2pdf';
`

`
const pdfBuffer = await hdHtml2Pdf({url:"www.google.com"}); // returns Buffer
`

* Built on top of puppeteer and still you have access to its methods.
* Make sure that you pass either an HTML string or url.
* The default dimensions are 1280 (configurable) by the height of the loaded web page, which will produce a nice looking PDF.
