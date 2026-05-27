# QuantGuide Question

## 849. Square Billy

**Metadata**

- ID: `6MX9beB1IeNHoNnBRqR6`
- URL: https://www.quantguide.io/questions/square-billy
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: AMC
- Tags: Events, Conditional Probability
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Billy is at $(1, 2)$ and begins a 2D symmetric random walk (each turn, Billy has a $\frac{1}{4}$ chance each of going up, down, right, or left). There is a square with vertices $(0, 0), (0, 4), (4, 4), (4, 0)$. Billy ends his random walk when he hits the square. What is the probability that Billy ends up on a vertical side of the square?

### Hint

Notice that if Billy is on one of the diagonals of the square, then the probabilities that he ends up on a horizontal or vertical side should equal one another.

### 解答

Notice that if Billy is on one of the diagonals of the square, then the probabilities that he ends up on a horizontal or vertical side should equal one another. At (1, 2), three moves make Billy end up on a diagonal, and one move (left) makes Billy immediately end up on a vertical side. Hence, our probability is
\[
\begin{aligned}
    \frac{1}{4} \cdot 1 + \frac{3}{4} \cdot \frac{1}{2} &= \frac{5}{8}
\end{aligned}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/8"
    ],
    "difficulty": "easy",
    "id": "6MX9beB1IeNHoNnBRqR6",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6929796,
    "source": "AMC",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Square Billy",
    "topic": "probability",
    "urlEnding": "square-billy"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "6MX9beB1IeNHoNnBRqR6",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Square Billy",
    "topic": "probability",
    "urlEnding": "square-billy"
  }
}
```
