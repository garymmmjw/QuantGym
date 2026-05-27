# QuantGuide Question

## 68. Non-Zero Eigenvalue

**Metadata**

- ID: `I1aixQd986vmcxE7XIOm`
- URL: https://www.quantguide.io/questions/nonzero-eigenvalue
- Topic: pure math
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: JHU Lin Alg, edited
- Tags: Linear Algebra
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-7 12:23:40 America/New_York
- Last Edited By: Gabe

### 题干

Let $x_n = \begin{bmatrix}

1 & 2 & \dots & n

\end{bmatrix}^T \in \mathbb{R}^n$. Define $A_n = x_nx_n^T$. For any fixed $n$, there is a single non-zero eigenvalue. Call this eigenvalue $\lambda_n$. Find the value of $k$ such that $\dfrac{\lambda_n}{n^k}$ converges to a finite non-zero value. 

### Hint

We know that the trace of a matrix is the sum of all the eigenvalues repeated according to their algebraic multiplicity. Find the algebraic multiplicity of this non-zero eigenvalue. Note that each of the rows of $A_n$ are linearly dependent. 

### 解答

We know that the trace of a matrix is the sum of all the eigenvalues repeated according to their algebraic multiplicity. We first need to find the algebraic multiplicity of this non-zero eigenvalue. The trick here is to note that each of the rows of $A_n$ are linearly dependent. Namely, the $k$th row of this matrix is a multiple $k$ times the first row. This means that the subspace $A_nx = 0$ (i.e. the null space of $A_n$) has geometric multiplicity $n-1$, as the other $n-1$ rows are a multiple of the first row. The dimension of the null space, however, is just the geometric multiplicity of $0$ as an eigenvalue. Therefore, $\text{GM}_{\lambda = 0}(A_n) = n-1$. 

$$$$

We now use another theorem that states that for any $n \times n$ matrix $A$ and eigenvalue of $A$, say $\lambda$, $1 \leq \text{GM}_{\lambda}(A) \leq \text{AM}_{\lambda}(A) \leq n$. As we know $\text{GM}_{\lambda = 0}(A_n) = n-1$, we have that $\text{AM}_{\lambda = 0}(A_n)$ is either $n-1$ or $n$. However, we can rule out $n$ by the fact that the if the algebraic multiplicity were $n$, the sum of all the eigenvalues (and hence the trace of $A_n$) would be $0$. However, one can quickly see that the trace of $A_n$ is $1^2 + 2^2 + \dots + n^2 = ||x_n||^2 = \dfrac{n(n+1)(2n+1)}{6}$ by working out the multiplication. Thus, the algebraic multiplicity of $\lambda = 0$ is $n-1$, and the last eigenvalue must be $$||x_n||^2 = \dfrac{n(n+1)(2n+1)}{6}$$ We can quickly see that the dominating term of $||x_n||^2$ is an $n^3$ term, so $k = 3$ is our answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "I1aixQd986vmcxE7XIOm",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:23:40 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 474779,
    "source": "JHU Lin Alg, edited",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Non-Zero Eigenvalue",
    "topic": "pure math",
    "urlEnding": "nonzero-eigenvalue",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "I1aixQd986vmcxE7XIOm",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Non-Zero Eigenvalue",
    "topic": "pure math",
    "urlEnding": "nonzero-eigenvalue"
  }
}
```
