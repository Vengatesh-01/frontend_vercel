// Web Worker for Chess AI
importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');

const weights = {
    p: 10, n: 30, b: 30, r: 50, q: 90, k: 900
};

function evaluateBoard(game) {
    let totalEvaluation = 0;
    const board = game.board();
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                const val = weights[piece.type];
                totalEvaluation += (piece.color === 'w' ? val : -val);
            }
        }
    }
    return totalEvaluation;
}

function minimax(game, depth, alpha, beta, isMaximizingPlayer) {
    if (depth === 0) return -evaluateBoard(game);
    const moves = game.moves();
    if (isMaximizingPlayer) {
        let bestEval = -9999;
        for (const move of moves) {
            game.move(move);
            bestEval = Math.max(bestEval, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
            game.undo();
            alpha = Math.max(alpha, bestEval);
            if (beta <= alpha) return bestEval;
        }
        return bestEval;
    } else {
        let bestEval = 9999;
        for (const move of moves) {
            game.move(move);
            bestEval = Math.min(bestEval, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
            game.undo();
            beta = Math.min(beta, bestEval);
            if (beta <= alpha) return bestEval;
        }
        return bestEval;
    }
}

function getBestMove(fen) {
    const game = new Chess(fen);
    const moves = game.moves();
    let bestMove = null;
    let bestValue = -9999;
    moves.sort(() => Math.random() - 0.5);

    for (const move of moves) {
        game.move(move);
        const boardValue = minimax(game, 2, -10000, 10000, false); // Reduced depth to 2 for instant response
        game.undo();
        if (boardValue > bestValue) {
            bestValue = boardValue;
            bestMove = move;
        }
    }
    return bestMove || moves[0];
}

onmessage = function (e) {
    const { fen } = e.data;
    const bestMove = getBestMove(fen);
    postMessage({ bestMove });
};
