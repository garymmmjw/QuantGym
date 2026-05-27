# QuantGuide Question

## 393. Triangle Walk

**Metadata**

- ID: `VmNNPXqaaYVTkmXzDTCx`
- URL: https://www.quantguide.io/questions/triangle-walk
- Topic: probability
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Consider a triangular grid composed of equilateral triangles with length 1 unit. Suppose, during each turn, Joey randomly selects the next grid line independently and uniformly. Compute the probability that, after 5 turns, Joey had ventured beyond 1 unit from his starting point at least once?

### Hint

It is easier to compute the probability that Joey never travels beyond 1 unit from his starting point. Let $N$ denote the total number of turns that Joey has taken without violating the condition. Note that Joey can only ever be at two states (let $x_0$ denote Joey's original starting point, and let $x_1$ denote any neighboring point that is exactly 1 unit away) without violating the condition. Let $X$ denote the state that Joey is in. Then, we have
\[\begin{aligned} 
\mathbb{P}(X = x_0, T = 0) &= 1 \\
\mathbb{P}(X = x_1, T = 0) &= 0 \\
\mathbb{P}(X = x_0, T = 1) &= 0 \\
\mathbb{P}(X = x_1, T = 1) &= 1
\end{aligned}\]

### 解答

It is easier to compute the probability that Joey never travels beyond 1 unit from his starting point. Let $N$ denote the total number of turns that Joey has taken without violating the condition. Note that Joey can only ever be at two states (let $x_0$ denote Joey's original starting point, and let $x_1$ denote any neighboring point that is exactly 1 unit away) without violating the condition. Let $X$ denote the state that Joey is in. Then, we have\[\begin{aligned} \mathbb{P}(X = x_0, T = 0) &= 1 \\\mathbb{P}(X = x_1, T = 0) &= 0 \\\mathbb{P}(X = x_0, T = 1) &= 0 \\\mathbb{P}(X = x_1, T = 1) &= 1\end{aligned}\]We wish to compute $\mathbb{P}(X = x_0, T = 0) + \mathbb{P}(X = x_1, T = 0)$. Note the following recurrence relation:\[\begin{aligned}\mathbb{P}(X = x_0, T = t) &= \frac{1}{6} \mathbb{P}(X = x_1, T = t-1)  \\\mathbb{P}(X = x_1, T = t) &= \frac{1}{3} \mathbb{P}(X = x_1, T = t-1) + \mathbb{P}(X = x_0, T = t-1)\\\end{aligned}\]Following this recurrence relation, we find:\[\begin{aligned}& \mathbb{P}(X = x_0, T = 0) = 1 & \mathbb{P}(X = x_1, T = 0) = 0 \\& \mathbb{P}(X = x_0, T = 1) = 0 & \mathbb{P}(X = x_1, T = 1) = 1 \\& \mathbb{P}(X = x_0, T = 2) = \frac{1}{6} & \mathbb{P}(X = x_1, T = 2) = \frac{1}{3} \\& \mathbb{P}(X = x_0, T = 3) = \frac{1}{18} & \mathbb{P}(X = x_1, T = 3) = \frac{5}{18} \\& \mathbb{P}(X = x_0, T = 4) = \frac{5}{108} & \mathbb{P}(X = x_1, T = 4) = \frac{4}{27} \\& \mathbb{P}(X = x_0, T = 5) = \frac{2}{81} & \mathbb{P}(X = x_1, T = 5) = \frac{31}{324} \\\end{aligned}\]Finally,\[\begin{aligned} 1 - (\mathbb{P}(X = x_0, T = 5) + \mathbb{P}(X = x_1, T = 5)) &= 1 - \frac{13}{108} = \frac{95}{108}\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "95/108"
    ],
    "difficulty": "medium",
    "id": "VmNNPXqaaYVTkmXzDTCx",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 3070846,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Triangle Walk",
    "topic": "probability",
    "urlEnding": "triangle-walk"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "VmNNPXqaaYVTkmXzDTCx",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Triangle Walk",
    "topic": "probability",
    "urlEnding": "triangle-walk"
  }
}
```
