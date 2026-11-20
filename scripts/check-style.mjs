import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const SKIPPED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".wrangler",
  ".git",
]);

function findSourceFiles(directoryPath, files = []) {
  const entries = readdirSync(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name) === false) {
        findSourceFiles(fullPath, files);
      }
      continue;
    }
    if (entry.isFile()) {
      const isTs = entry.name.endsWith(".ts");
      const isTsx = entry.name.endsWith(".tsx");
      if (isTs || isTsx) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function allowsDefaultExport(filePath) {
  const normalizedPath = filePath.replaceAll("\\", "/");
  if (normalizedPath.endsWith(".config.ts")) {
    return true;
  }
  if (normalizedPath.endsWith("apps/api/src/worker.ts")) {
    return true;
  }
  return false;
}

function hasDefaultModifier(node) {
  if (node.modifiers === undefined) {
    return false;
  }
  return node.modifiers.some((modifier) => {
    return modifier.kind === ts.SyntaxKind.DefaultKeyword;
  });
}

function isDefaultExport(node, relativePath) {
  if (allowsDefaultExport(relativePath)) {
    return false;
  }
  if (ts.isExportAssignment(node)) {
    return Boolean(node.isExportEquals) === false;
  }
  return hasDefaultModifier(node);
}

function isDisallowedTypeAssertion(node, sourceFile) {
  const isAssertion = ts.isAsExpression(node) || ts.isTypeAssertionExpression(node);
  if (isAssertion === false) {
    return false;
  }
  return node.type.getText(sourceFile) !== "const";
}

function recordCommentProblem(
  sourceFile,
  relativePath,
  range,
  problems,
  reportedComments,
) {
  if (reportedComments.has(range.pos)) {
    return;
  }
  reportedComments.add(range.pos);
  const lineNumber = sourceFile.getLineAndCharacterOfPosition(range.pos).line + 1;
  problems.push(`${relativePath}:${lineNumber} comment`);
}

function checkTokenComments(
  node,
  sourceFile,
  text,
  relativePath,
  problems,
  reportedComments,
) {
  const leadingRanges = ts.getLeadingCommentRanges(text, node.getFullStart());
  if (leadingRanges !== undefined) {
    for (const range of leadingRanges) {
      recordCommentProblem(
        sourceFile,
        relativePath,
        range,
        problems,
        reportedComments,
      );
    }
  }
  const trailingRanges = ts.getTrailingCommentRanges(text, node.getEnd());
  if (trailingRanges !== undefined) {
    for (const range of trailingRanges) {
      recordCommentProblem(
        sourceFile,
        relativePath,
        range,
        problems,
        reportedComments,
      );
    }
  }
}

function getLineNumber(sourceFile, node) {
  const position = node.getStart(sourceFile);
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function checkNode(
  node,
  sourceFile,
  text,
  relativePath,
  problems,
  reportedComments,
) {
  const children = node.getChildren(sourceFile);
  if (children.length === 0) {
    checkTokenComments(
      node,
      sourceFile,
      text,
      relativePath,
      problems,
      reportedComments,
    );
  }

  if (node.kind === ts.SyntaxKind.AnyKeyword) {
    const line = getLineNumber(sourceFile, node);
    problems.push(`${relativePath}:${line} any type`);
  }

  if (node.kind === ts.SyntaxKind.NonNullExpression) {
    const line = getLineNumber(sourceFile, node);
    problems.push(`${relativePath}:${line} non-null assertion`);
  }

  if (isDisallowedTypeAssertion(node, sourceFile)) {
    const line = getLineNumber(sourceFile, node);
    problems.push(`${relativePath}:${line} type assertion`);
  }

  if (isDefaultExport(node, relativePath)) {
    const line = getLineNumber(sourceFile, node);
    problems.push(`${relativePath}:${line} default export`);
  }

  for (const child of children) {
    checkNode(
      child,
      sourceFile,
      text,
      relativePath,
      problems,
      reportedComments,
    );
  }
}

function getScriptKind(filePath) {
  if (filePath.endsWith(".tsx")) {
    return ts.ScriptKind.TSX;
  }
  return ts.ScriptKind.TS;
}

function checkSourceFile(projectRoot, fullPath, problems) {
  const relativePath = relative(projectRoot, fullPath).replaceAll("\\", "/");
  const content = readFileSync(fullPath, "utf8");
  const scriptKind = getScriptKind(fullPath);
  const sourceFile = ts.createSourceFile(
    fullPath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const reportedComments = new Set();
  checkNode(
    sourceFile,
    sourceFile,
    content,
    relativePath,
    problems,
    reportedComments,
  );
}

function runStyleCheck() {
  const projectRoot = process.cwd();
  const sourceFiles = findSourceFiles(projectRoot);
  const problems = [];
  for (const file of sourceFiles) {
    checkSourceFile(projectRoot, file, problems);
  }
  if (problems.length > 0) {
    for (const problem of problems) {
      console.log(problem);
    }
    process.exit(1);
  }
  console.log("style ok");
  process.exit(0);
}

runStyleCheck();
