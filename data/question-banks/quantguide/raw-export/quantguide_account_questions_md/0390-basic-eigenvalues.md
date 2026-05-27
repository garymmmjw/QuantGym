# QuantGuide Question

## 390. Basic Eigenvalues

**Metadata**

- ID: `8SLddsbEmUV2OeHgojSV`
- URL: https://www.quantguide.io/questions/basic-eigenvalues
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 1
- Companies: TransMarket Group, Goldman Sachs
- Source: tmg interview
- Tags: Linear Algebra
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-7 12:23:24 America/New_York
- Last Edited By: Gabe

### 题干

You have the following matrix

$$\left[ \begin{array}{cc} 
-5 & 2 \\ 
-7 & 4 
\end{array}\right]$$

There are $2$ eigenvalues, $a$ and $b$. What are the two eigenvalues? Give the answer in the format $a^2 + b^2$. 

### Hint

What is the characteristic function? 

### 解答

We can obtain the characteristic function by finding the solutions $\lambda$ that solve $\det(A - \lambda I) = 0$

We have $A - \lambda I =\left[ \begin{array}{cc} 
-5 - \lambda & 2 \\ 
-7 & 4 - \lambda
\end{array}\right]$ 

$$\\$$

This gives the characteristic function $(-5-\lambda)(4-\lambda) + 14 = \lambda^2 + \lambda - 6 = 0$. We can factor this into $(\lambda + 3)(\lambda - 2) = 0$, giving $\lambda = -3$, $\lambda = 2$. Plugging the values in, we get $(-3)^2 + 2^2 = 13$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "13"
    ],
    "companies": [
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "8SLddsbEmUV2OeHgojSV",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:23:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3033637,
    "source": "tmg interview",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Basic Eigenvalues",
    "topic": "pure math",
    "urlEnding": "basic-eigenvalues",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "id": "8SLddsbEmUV2OeHgojSV",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Basic Eigenvalues",
    "topic": "pure math",
    "urlEnding": "basic-eigenvalues"
  }
}
```
