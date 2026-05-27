# QuantGuide Question

## 152. Power to the Matrix

**Metadata**

- ID: `uSa3vJb2g2kdDvp8R618`
- URL: https://www.quantguide.io/questions/power-to-the-matrix
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Goldman Sachs
- Source: original
- Tags: Linear Algebra
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-17 13:09:24 America/New_York
- Last Edited By: Gabe

### 题干

Let $A = \begin{bmatrix}
3 & 1\\
4 & 3
\end{bmatrix}$ Find $A^{10}v$, where $v = \begin{bmatrix} 3 \\ 2\end{bmatrix}$. The answer is in the form $$\begin{bmatrix} a \cdot b^{p} + c \\ d \cdot b^{p} - g \end{bmatrix}$$ For integers $a,b,c,d,p$. Find $bp + a + c + d + g$.

### Hint

First, find the eigenvalues of $A$. The characteristic polynomial is $p(\lambda) = \lambda^2 - \text{tr}(A) \lambda + \text{det}(A)$. Then, find their eigenvectors. Lastly, you need to write $v$ in terms of your eigenvector basis.

### 解答

We first need to find the eigenvalues of $A$. The characteristic polynomial is $p(\lambda) = \lambda^2 - \text{tr}(A) \lambda + \text{det}(A)$. It is easy to see that $\text{tr}(A) = 6$ and $\text{det}(A) = 5$, so we need to solve $\lambda^2 - 6\lambda + 5 = 0$. This easily factors to $(\lambda - 5)(\lambda - 1) = 0$, so $\lambda = 1,5$ are the eigenvalues.

$$$$

Next, we want the eigenvectors corresponding to each eigenvalue. We do this by solving $(A - \lambda I_2)x = 0$. For $\lambda = 1$, this becomes $$\begin{bmatrix}
2 & 1 \\
4 & 2
\end{bmatrix} x = \begin{bmatrix}
0\\
0
\end{bmatrix}
$$

The solution set to this is $x = t\begin{bmatrix} 1 \\ -2\end{bmatrix}$ for $t \in \mathbb{R}$. Our eigenvector is therefore $e_1 = \begin{bmatrix} 1 \\ -2\end{bmatrix}$. '

$$$$

For $\lambda = 5$, this equation becomes $$\begin{bmatrix}
-2 & 1 \\
4 & -2
\end{bmatrix} x = \begin{bmatrix}
0\\
0
\end{bmatrix}
$$

The solution set to this is $x = t\begin{bmatrix} 1 \\ 2\end{bmatrix}$ for $t \in \mathbb{R}$. Our eigenvector is therefore $e_5 = \begin{bmatrix} 1 \\ 2\end{bmatrix}$.

$$$$

We now need to write $v$ in terms of our eigenvector basis. However, it is fairly clear to see that $v = e_1 + 2e_5$.  By the fact that $e_1$ and $e_5$ are eigenvalues of $A$, we have that $$A^{10}v = A^{10}(e_1 + 2e_5) = A^{10}e_1 + 2A^{10}e_5 = 1^{10} \cdot e_1 + 2 \cdot 5^{10} e_5 = \begin{bmatrix} 2 \cdot 5^{10} + 1 \\ 4 \cdot 5^{10} - 2 \end{bmatrix}$$

This means our answer is $5 \cdot 10 + 1 + 4 + 2 + 2 = 59$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "59"
    ],
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "uSa3vJb2g2kdDvp8R618",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-17 13:09:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1130400,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Power to the Matrix",
    "topic": "pure math",
    "urlEnding": "power-to-the-matrix",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "uSa3vJb2g2kdDvp8R618",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Power to the Matrix",
    "topic": "pure math",
    "urlEnding": "power-to-the-matrix"
  }
}
```
