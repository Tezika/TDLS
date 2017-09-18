import * as log from 'fancy-log'

export class Lexer {
    private _greeting:string;
    constructor(message:string) { 
        this._greeting  = message;
    }
     Greeting(){
        log("Greeting: " +  this._greeting); 
    } 
}
