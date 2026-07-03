// syntaxes/keiro.tmLanguage.json
var keiro_tmLanguage_default = {
  $schema: "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
  name: "keiro",
  scopeName: "source.keiro",
  patterns: [
    { include: "#comments" },
    { include: "#strings" },
    { include: "#dashed-keywords" },
    { include: "#decl-with-name" },
    { include: "#introducers" },
    { include: "#modifiers" },
    { include: "#constants" },
    { include: "#types" },
    { include: "#control-keywords" },
    { include: "#numbers" },
    { include: "#operators" }
  ],
  repository: {
    comments: {
      match: "#.*$",
      name: "comment.line.number-sign.keiro"
    },
    strings: {
      name: "string.quoted.double.keiro",
      begin: '"',
      end: '"'
    },
    "dashed-keywords": {
      match: "(?<![A-Za-z0-9_-])(?:status-map|dispatch-id|fired-event-id|on-appended|on-duplicate|on-failed|on-ok|on-reject|on-error|not-mine|unknown-status|max-attempts|dead-letter|kafka-key|kafka-cursor|cross-check)(?![A-Za-z0-9_-])",
      name: "keyword.control.keiro"
    },
    "decl-with-name": {
      match: "\\b(aggregate|process|contract|intake|enum|command|event|workflow|operation|rule|id)\\b\\s+([A-Za-z_][A-Za-z0-9_]*)",
      captures: {
        "1": { name: "keyword.declaration.keiro" },
        "2": { name: "entity.name.type.keiro" }
      }
    },
    introducers: {
      match: "(?<![A-Za-z0-9_])(?:context|id|enum|rule|aggregate|process|contract|intake|emit|publisher|workqueue|dispatch|workflow|operation)(?![A-Za-z0-9_])",
      name: "keyword.declaration.keiro"
    },
    modifiers: {
      match: "(?<![A-Za-z0-9_])(?:deprecated|upcast|from|consistency|required|stable|strategy|via|policy|prefix|kind)(?![A-Za-z0-9_])",
      name: "storage.modifier.keiro"
    },
    constants: {
      patterns: [
        {
          match: "(?<![A-Za-z0-9_])(?:true|false)(?![A-Za-z0-9_])",
          name: "constant.language.boolean.keiro"
        },
        {
          match: "(?<![A-Za-z0-9_])(?:HOLE|placeholder|skip|hole)(?![A-Za-z0-9_])",
          name: "constant.language.keiro"
        }
      ]
    },
    types: {
      match: "(?<![A-Za-z0-9_])(?:Bool|Int|Text|Time|Id|Maybe|typeid|text|int)(?![A-Za-z0-9_])",
      name: "support.type.keiro"
    },
    "control-keywords": {
      match: "(?<![A-Za-z0-9_])(?:regs|states|command|event|wire|projection|guard|write|emit|goto|fields|accept|bind|dedupe|decode|disposition|map|queue|payload|retry|fanout|dedup|enqueue|seenIn|body|step|await|sleep|child|topic|ex|name|input|output|in|out|correlate|saga|stream|target|projections|on|advance|schedule|timer|fireAt|fire|source|key|value|run|signal|query|project|result|ordering|backoff|outboxId|messageId|idempotencyKey|discriminator|schemaVersion|derive|of|after|logical|physical|dlq|table|maxRetries|maxAttempts|delay|readModel|field|to|envelope)(?![A-Za-z0-9_])",
      name: "keyword.control.keiro"
    },
    numbers: {
      patterns: [
        { match: "\\bv[0-9]+\\b", name: "constant.numeric.keiro" },
        { match: "\\b[0-9]+[a-zA-Z]+\\b", name: "constant.numeric.keiro" },
        { match: "\\b[0-9]+\\b", name: "constant.numeric.keiro" }
      ]
    },
    operators: {
      match: "-->|--|->|:=|=>|==|!=|<=|>=|<>|&&|\\|\\||[<>@!+;=]",
      name: "keyword.operator.keiro"
    }
  }
};

// src/index.ts
var keiro = {
  ...keiro_tmLanguage_default,
  name: "keiro",
  scopeName: "source.keiro",
  aliases: ["keiro-dsl"]
};
var index_default = keiro;
export {
  index_default as default,
  keiro
};
