class DivWriter {
    constructor(){
        this.dw = {}
        this.logger = document.getElementById("logger");
        this.dw.log = text =>
        {
            let element = document.createElement("div");
            let txt = document.createTextNode(text);
            element.appendChild(txt);
            logger.appendChild(element);
        }
    }
    log(message) {
        this.dw.log(message);
    }
}