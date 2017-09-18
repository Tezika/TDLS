    declare module lexer
    {
        class Lexer {
            constructor(name: string);
            Greeting(): void;
        }
    } 

    declare module 'lexer'
    {
        export = lexer;
    }