export const mathFunctions =
/* glsl */`
// float
float fabs(float a) {
    return abs(a);
}

// vec3
vec3 sub3(vec3 a, vec3 b, out vec3 c) {
    return c = a - b;
}

float dot3(vec3 a, vec3 b) {
    return dot(a, b);
}

vec3 cross3(vec3 a, vec3 b, out vec3 c) {
    return c = cross(a, b);
}

vec3 scale3(float s, vec3 a, out vec3 b) {
    return b = s * a;
}

float mag3(vec3 a) {
    return length(a);
}

vec3 unit3(vec3 a, out vec3 b) {
    return b = normalize(a);
}

vec3 copy3(vec3 a, out vec3 b) {
    return b = a;
}

vec3 add3(vec3 a, vec3 b, out vec3 c) {
    return c = a + b;
}

// mat33
mat3 ident33(out mat3 a) {
    return a = mat3(
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0
    );
}

mat3 add33(mat3 a, mat3 b, out mat3 c) {
    return c = a + b;
}

mat3 sub33(mat3 a, mat3 b, out mat3 c) {
    return c = a - b;
}

mat3 mult313(vec3 a, vec3 b, out mat3 c) {
    return c = mat3(
        a[0] * b[0], a[0] * b[1], a[0] * b[2],
        a[1] * b[0], a[1] * b[1], a[1] * b[2],
        a[2] * b[0], a[2] * b[1], a[2] * b[2]
    );
}

mat3 scale33(float s, mat3 a, out mat3 b) {
    return b = s * a;
}
`;
