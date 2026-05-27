# QuantGuide Question

## 51. Diagonal Eigenvalue

**Metadata**

- ID: `nxADDbnfV2HJo23vv2TI`
- URL: https://www.quantguide.io/questions/diagonal-eigenvalue
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Akuna, WorldQuant, Goldman Sachs, DE Shaw
- Source: Akuna
- Tags: Linear Algebra
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 13:07:47 America/New_York
- Last Edited By: Gabe

### 题干

Consider the matrix $30 \times 30$ matrix $A$ with $A_{ii} = 30$ for $1 \leq i \leq 30$ and $A_{ij} = 1$ for $i \neq j$. Let $\lambda = \begin{bmatrix} \lambda_1 \\ \lambda_2 \end{bmatrix}$ be the vector of distinct eigenvalues $\lambda_1 \neq \lambda_2$ of $A$ and $g = \begin{bmatrix} g_1 \\ g_2 \end{bmatrix}$ be the vector of geometric multiplicities corresponding to $\lambda_1$ and $\lambda_2$, respectively. Find $||\lambda + g||^2$

### Hint

A fact from Linear Algebra states that if $M$ is $n \times n$ with eigenvalues (repeated according to multiplicity) $\{\lambda_i\}_{i=1}^n$, then the eigenvalues of $M + kI_n$ is $\{\lambda_i + k\}_{i=1}^n$. Note that we can write $A = 1_{30} + 29I_{30}$, where $1_{30}$ is the $30 \times 30$ matrix of all ones. 

### 解答

A fact from Linear Algebra states that if $M$ is $n \times n$ with eigenvalues (repeated according to multiplicity) $\{\lambda_i\}_{i=1}^n$, then the eigenvalues of $M + kI_n$ is $\{\lambda_i + k\}_{i=1}^n$. Note that we can write $A = 1_{30} + 29I_{30}$, where $1_{30}$ is the $30 \times 30$ matrix of all ones. 

$$$$

To find the eigenvalues of $1_{30}$, we can simply note that every row is dependent on the first, so the geometric multiplicity of the eigenvalue $0$ is $29$. Since the sum of the eigenvalues is the trace, we can see that the algebraic multiplicity is also $29$ and that the last eigenvalue must be $30$, as tr$(1_{30}) = 30$. Therefore, the eigenvalues of $A$ are $29$ with geometric multiplicity $29$ and $30 + 29 = 59$ with geometric multiplicity $1$. 

$$$$

This means that $\lambda + g = \begin{bmatrix} 58 \\\ 60 \end{bmatrix}$, so $||\lambda + g||^2 = 58^2 + 60^2 = 6964$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6964"
    ],
    "companies": [
      {
        "company": "Akuna"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "nxADDbnfV2HJo23vv2TI",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:07:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 364173,
    "source": "Akuna",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Diagonal Eigenvalue",
    "topic": "pure math",
    "urlEnding": "diagonal-eigenvalue",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Akuna"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "medium",
    "id": "nxADDbnfV2HJo23vv2TI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Diagonal Eigenvalue",
    "topic": "pure math",
    "urlEnding": "diagonal-eigenvalue"
  }
}
```
