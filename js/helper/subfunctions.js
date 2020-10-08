import { Coordinate } from "../graph_elements/coordinate.js";

export function judge_intersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const a = (x3 - x4) * (y1 - y3) + (y3 - y4) * (x3 - x1);
    const b = (x3 - x4) * (y2 - y3) + (y3 - y4) * (x3 - x2);
    const c = (x1 - x2) * (y3 - y1) + (y1 - y2) * (x1 - x3);
    const d = (x1 - x2) * (y4 - y1) + (y1 - y2) * (x1 - x4);

    return a * b < 0 && c * d < 0;
}

export function intersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const det = (x1 - x2) * (y4 - y3) - (x4 - x3) * (y1 - y2);
    const t = ((y4 - y3) * (x4 - x2) + (x3 - x4) * (y4 - y2)) / det;
    const x = t * x1 + (1.0 - t) * x2;
    const y = t * y1 + (1.0 - t) * y2;
    return [x, y];
}

export function euclidean_distance(p, q) {
    return Math.sqrt(Math.pow(p.x - q.x, 2) + Math.pow(p.y - q.y, 2));
}

export function similarity_length(l, a, b, c) {
    return l * (c - a) / (b - a);
}

export function project_point_on_line(p, Q_src, Q_tar) {
    const L = Math.sqrt((Q_tar.x - Q_src.x) * (Q_tar.x - Q_src.x) + (Q_tar.y - Q_src.y) * (Q_tar.y - Q_src.y));
    const r = ((Q_src.y - p.y) * (Q_src.y - Q_tar.y) - (Q_src.x - p.x) * (Q_tar.x - Q_src.x)) / (L * L);

    return new Coordinate(
        Q_src.x + r * (Q_tar.x - Q_src.x),
        Q_src.y + r * (Q_tar.y - Q_src.y),
    );
}

export function culculate_final_subdivision_num(P_initial, P_rate, C) {
    let P = P_initial
    for (let i = 0; i < C; i++) {
        P = (Math.ceil(P * P_rate) == P ? P + 1 : Math.ceil(P * P_rate));
    }
    return P;
}


