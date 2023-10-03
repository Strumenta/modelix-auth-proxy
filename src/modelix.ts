import { Express, NextFunction, Request, Response } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

export function putAuthHandler() {
  return (request: Request, response: Response, nextFunction: NextFunction) => {
    // TODO implement /put authorization logic (if needed)
    return nextFunction();
  };
}

export function putAllAuthHandler() {
  const accessibleRepositories = [
    'info',
    // repository containing the Common module
    // 'competence_center_0',
    // repository containing the TechnicalStuff module
    'competence_center_1'
  ];

  const modelEntries = new Map<string, string>();

  function extractModelEntriesFrom(request: Request): void {
    request.body.forEach((entry: { key: string; value: string }) => {
      modelEntries.set(entry.key, entry.value);
    });
  }

  function containsBranchModelEntry(request: Request): boolean {
    return request.body.some((entry: { key: string }) => entry.key.startsWith('branch_'));
  }

  function extractAccessedRepository(): string | undefined {
    // 1. find entry with key starting with 'branch_' and get value
    const firstKey = Array.from(modelEntries.keys()).find((key) => key.startsWith('branch_'));
    if (firstKey === undefined) return undefined;
    // 2. find entry with key from previous step, get value and extract next key
    const secondKey = modelEntries.get(firstKey);
    if (secondKey === undefined) return undefined;
    const secondValue = modelEntries.get(secondKey);
    if (secondValue === undefined) return undefined;
    // 3. find entry with key from previous step, get value and extract repository
    const thirdKey = secondValue.split('//')[1].split('/')[0];
    const thirdValue = modelEntries.get(thirdKey);
    if (thirdValue === undefined) return undefined;
    return thirdValue.substring(0, thirdValue.indexOf('/'));
  }

  function canAccessRepository(): boolean {
    const accessedRepository = extractAccessedRepository();
    const outcome = accessibleRepositories.some(
      (accessibleRepository) => accessibleRepository === accessedRepository
    );
    console.log(
      `ACCESS TO REPOSITORY: ${accessedRepository ?? 'unknown'} -> ${outcome ? '' : 'NOT '}ALLOWED`
    );
    return outcome;
  }

  function handleAuthorizedRequest(request: Request, nextFunction: NextFunction) {
    const body = Array.from(modelEntries).map((entry) => ({ key: entry[0], value: entry[1] }));
    request.body = body;
    request.headers['content-type'] = 'application/json';
    request.headers['content-length'] = `${body.length}`;
    modelEntries.clear();
    return nextFunction();
  }

  function handleUnauthorizedRequest(reponse: Response) {
    modelEntries.clear();
    return reponse.sendStatus(403);
  }

  function handleIncompleteRequest(response: Response) {
    return response.sendStatus(200);
  }

  return (request: Request, response: Response, nextFunction: NextFunction) => {
    extractModelEntriesFrom(request);
    return containsBranchModelEntry(request)
      ? canAccessRepository()
        ? handleAuthorizedRequest(request, nextFunction)
        : handleUnauthorizedRequest(response)
      : handleIncompleteRequest(response);
  };
}

export function modelServerProxy() {
  return createProxyMiddleware({
    target: process.env.MODEL_SERVER_URL,
    changeOrigin: true,
    secure: true,
    onProxyReq: fixRequestBody
  });
}

export function setupModelixAuthProxy(app: Express) {
  app.post('/put', putAuthHandler());
  app.post('/putAll', putAllAuthHandler());
  app.use(modelServerProxy);
}
