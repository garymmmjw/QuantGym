# QuantGuide Question

## 349. Matrix Editor

**Metadata**

- ID: `NkpDUARNB3COFsZYjuRV`
- URL: https://www.quantguide.io/questions/matrix-editor
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: original
- Tags: Expected Value, Conditional Expectation
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose you start with the $2 \times 2$ identity matrix $I_2$. At each step, select one of the four elements of the matrix uniformly at random. If the element you select is a $1$, change it to $0$. If the element you select is a $0$, change it to $1$. Find the expected number of steps needed to obtain a singular matrix (i.e. the determinant is 0).

### Hint

Let $I$ be the number of steps needed to obtain a singular matrix starting from the identity matrix. This value depends on which value in our matrix is edited first, so apply Law of Total Expectation to what value is edited first. 

### 解答

Let $I$ be the number of steps needed to obtain a singular matrix starting from the identity matrix. This value depends on which value in our matrix is edited first, so let's apply Law of Total Expectation to what value is edited first. 

$$$$

If we select one of the diagonal elements, then it is easy to verify we obtain a singular matrix. Otherwise, if we select one of the off-diagonal elements, we end up with either $\begin{bmatrix}
1 & 1 \\
0 &  1
\end{bmatrix}$ or $\begin{bmatrix}
1 & 0 \\
1 & 1
\end{bmatrix}$. However, a property of determinants is that for any square matrix $A$, $\text{det}(A) = \text{det}(A^T)$. Additionally, we select the elements uniformly at random, so these matrix will have the same expected time until they reach a singular matrix. Let $O$ be the expected time to reach a singular matrix starting from $\begin{bmatrix}
1 & 1 \\
0 &  1
\end{bmatrix}$. Then by LOTE, $$\mathbb{E}[T] = \dfrac{1}{2} \cdot 1 + \dfrac{1}{2} \left(1 + \mathbb{E}[O]\right) = 1 + \dfrac{1}{2}\mathbb{E}[O]$$


Now, we need to evaluate $\mathbb{E}[O]$. It is easy to verify that if we select any element besides the top right corner, we end up with a singular matrix in the next iteration. Therefore, with probability $\dfrac{3}{4}$, it takes $1$ step. If we select the top right corner, we are back at the identity matrix. Therefore, $$\mathbb{E}[O] = \dfrac{3}{4} \cdot 1 + \dfrac{1}{4} \left(1 + \mathbb{E}[I]\right) = 1 + \dfrac{1}{4} \mathbb{E}[I]$$

Plugging in the equation for $\mathbb{E}[O]$ into the one for $\mathbb{E}[I]$ and simplifying, $\mathbb{E}[I] = \dfrac{12}{7}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "12/7"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "NkpDUARNB3COFsZYjuRV",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2668356,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Matrix Editor",
    "topic": "probability",
    "urlEnding": "matrix-editor"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "NkpDUARNB3COFsZYjuRV",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Matrix Editor",
    "topic": "probability",
    "urlEnding": "matrix-editor"
  }
}
```
