# QuantGuide Question

## 36. Correlation Ranges

**Metadata**

- ID: `I9fWVDRGZW0etqL9bAwD`
- URL: https://www.quantguide.io/questions/correlation-ranges
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Jane Street, WorldQuant, Citadel, Morgan Stanley, Squarepoint Capital
- Source: AQR interview
- Tags: Covariance
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-12 16:32:57 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X,Y,$ and $Z$ are three random variables. We know that Corr$(X,Y) = \dfrac{5}{13}$ and Corr$(Y,Z) = \dfrac{12}{13}$. The range of possible values for Corr$(X,Z)$ is an interval in the form $[0,b]$, where $b$ is a fraction in fully reduced form. Find $b$.

### Hint

The key idea here is that the correlation matrix for any collection of random variables must be positive semi-definite. A condition to show that a matrix is positive definite is that each of the sub-matrices of order $1 \times 1, 2 \times 2, \dots, n \times n$, where $n$ is a size of the matrix, originating from the top left corner have positive determinant. The case where you have determinant of $0$ can be individually analyzed.

### 解答

The key idea here is that the correlation matrix for any collection of random variables must be positive semi-definite. Denoting Corr$(X,Z) = \rho$, the correlation matrix for $(X,Y,Z)$, say $C$, is a $3 \times 3$ matrix 
$$
\begin{bmatrix}
1 & \frac{5}{13} & \rho \\
\frac{5}{13} & 1 & \frac{12}{13} \\
\rho & \frac{12}{13} & 1
\end{bmatrix}
$$

$$$$

A condition to show that a matrix is positive definite is that each of the sub-matrices of order $1 \times 1, 2 \times 2, \dots, n \times n$, where $n$ is a size of the matrix, originating from the top left corner have non-negative determinant. In this case, it is easy to see that the top left $2\times 2$ matrix has determinant $C_{11}C_{22} - C_{12}C_{21} = \dfrac{144}{169} > 0$, so we only need to check that the entire matrix $C$ has non-negative determinant.

$$$$

Evaluating this determinant as a function of $\rho$, we obtain that it is $\dfrac{120}{169}\rho - \rho^2$. Setting this equal to $0$, we obtain that $\rho = 0,\dfrac{120}{169}$. As this polynomial had a negative leading coefficient for $\rho^2$, it follows that the parabola (i.e. determinant) must have been positive between the two roots, so $\rho^* = \dfrac{120}{169}$ is the largest value where this determinant is non-negative.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "120/169"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Morgan Stanley"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "I9fWVDRGZW0etqL9bAwD",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-12 16:32:57 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 263624,
    "source": "AQR interview",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Correlation Ranges",
    "topic": "probability",
    "urlEnding": "correlation-ranges",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Morgan Stanley"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "id": "I9fWVDRGZW0etqL9bAwD",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Correlation Ranges",
    "topic": "probability",
    "urlEnding": "correlation-ranges"
  }
}
```
