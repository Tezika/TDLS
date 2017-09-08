/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	IPCMessageReader, IPCMessageWriter,
	createConnection, IConnection, TextDocumentSyncKind,
	TextDocuments, TextDocument, Diagnostic, DiagnosticSeverity,
	InitializeParams, InitializeResult, TextDocumentPositionParams,
	CompletionItem, CompletionItemKind
} from 'vscode-languageserver';

// Create a connection for the server. The connection uses Node's IPC as a transport
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initialize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilities. 
let workspaceRoot: string;
connection.onInitialize((params): InitializeResult => {
	workspaceRoot = params.rootPath;
	return {
		capabilities: {
			// Tell the client that the server works in FULL text document sync mode
			textDocumentSync: documents.syncKind,
			// Tell the client that the server support code complete
			completionProvider: {
				resolveProvider: true
			}
		}
	}
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
	validateTextDocument(change.document);
});

// The settings interface describe the server relevant settings part
interface Settings {
	languageServerExample: ExampleSettings;
}

// These are the example settings we defined in the client's package.json
// file
interface ExampleSettings {
	maxNumberOfProblems: number;
}

interface DocumentLineChecker {
	(line: string, idxOfLine: number): Diagnostic[];
}
// hold the maxNumberOfProblems setting
let maxNumberOfProblems: number;

//Some fundamental regex expression
let commentRegex: RegExp = new RegExp("\\(([^\\)]*)\\)");

let dialogueRegex: RegExp = new RegExp("\\-\\s*(\\<([^\\>]*)?\\>)?\\s*(\\{([^\\}]*)?\\})?\\s*([\\u4e00-\\u9fa5|a-zA-Z0-9]*)?\\s*(\\[([^\\]]*)\\])?\\s*\\:\\s*([\\s\\S]*)?\\s*");

//Define the line checker for dialogue.
let dialogueLineChecker: DocumentLineChecker;
dialogueLineChecker = function (line: string, idxOfLine: number): Diagnostic[] {
	let diagnostics: Diagnostic[] = [];
	let colonIdx = line.indexOf(":");
	let minusIdx = line.indexOf("-");
	if (colonIdx < 0) {
		diagnostics.push({
			severity: DiagnosticSeverity.Error,
			range: {
				start: { line: idxOfLine, character: 0 },
				end: { line: idxOfLine, character: 2 }
			},
			message: `Line ${idxOfLine + 1}:A dialogue should contain a colon!`,
			source: 'tdls'
		});
	}
	else {
		//Get the actual line content without comments
		let actualLine = line.replace(commentRegex, "");
		let dialogueMatch = dialogueRegex.exec(actualLine);
		if (dialogueMatch) {
			if (dialogueMatch[5] == undefined) {
				diagnostics.push({
					severity: DiagnosticSeverity.Warning,
					range: {
						start: { line: idxOfLine, character: colonIdx - 2 },
						end: { line: idxOfLine, character: colonIdx }
					},
					message: `Line ${idxOfLine + 1}:A dialogue needs a character!`,
					source: 'tdls'
				});
			}
		}

	}
	return diagnostics;
}

//Define the line checker for event
let eventLineChecker: DocumentLineChecker;
eventLineChecker = function (line: string, idxOfLine: number): Diagnostic[] {
	let diagnostics: Diagnostic[] = [];
	return diagnostics;
}


// The settings have changed. Is send on server activation
// as well.
connection.onDidChangeConfiguration((change) => {
	let settings = <Settings>change.settings;
	maxNumberOfProblems = settings.languageServerExample.maxNumberOfProblems || 100;
	// Revalidate any open text documents
	documents.all().forEach(validateTextDocument);
});


function validateTextDocument(textDocument: TextDocument): void {
	let diagnostics: Diagnostic[] = [];
	let lines = textDocument.getText().split(/\r?\n/g);
	//get every line.
	let problems = 0;
	for (var i = 0; i < lines.length && problems < maxNumberOfProblems; i++) {
		let line = lines[i];
		let trim_line = line.trim();
		if (trim_line[0] == '-') {
			var dialogueDiagns = dialogueLineChecker(line, i);
			problems += dialogueDiagns.length;
			diagnostics.push(...dialogueDiagns);
		}
		else if (trim_line[1] == "#") {
			var eventDialogues = eventLineChecker(line, i);
			problems += eventDialogues.length;
			diagnostics.push(...eventDialogues);
		}
	}
	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}


connection.onDidChangeWatchedFiles((change) => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});


// This handler provides the initial list of the completion items.
connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
	// The pass parameter contains the position of the text document in 
	// which code complete got requested. For the example we ignore this
	// info and always provide the same completion items.
	return [
	]
});

// This handler resolve additional information for the item selected in
// the completion list.
// connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
// 	if (item.data === 1) {
// 		item.detail = 'TypeScript details',
// 		item.documentation = 'TypeScript documentation'
// 	} else if (item.data === 2) {
// 		item.detail = 'JavaScript details',
// 		item.documentation = 'JavaScript documentation'
// 	}
// 	return item;
// });

let t: Thenable<string>;

/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.textDocument.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.textDocument.text the initial full content of the document.
	connection.console.log(`${params.textDoc ument.uri} opened.`);
});

connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
 
*/
connection.onDidCloseTextDocument((params) => {
	//A text document got closed in VSCode.
	//params.textDocument.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});

// Listen on the connection
connection.listen();

