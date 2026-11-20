// Runs before each e2e test file, after the previous file is torn down and before Jest starts V8 coverage for
// this one. Starting precise coverage makes V8 keep the feedback vectors of every function still on the heap,
// including the garbage of the previous files, so without a collection here each file keeps all the files before
// it alive. Workers then grow to several GB and exit too slowly for Jest
// ("A worker process has failed to exit gracefully").
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

setFlagsFromString('--expose-gc');
runInNewContext('gc')();
