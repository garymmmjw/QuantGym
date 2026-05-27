# QuantGuide Question

## 516. Family Ties

**Metadata**

- ID: `yr0K1pGbRk5gtFGLCMVy`
- URL: https://www.quantguide.io/questions/family-ties
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A grandmother has two grandchildren and their ages so conveniently line up that the age of each grandchild is one of the digits of the grandmother's age. Additionally, the sum of all three ages is 98. What is the age of the grandmother?

### Hint

Let $x$ be the age of the $10$s digit child and $y$ be the age of the $1$s digit child. What is the grandmother's age in terms of $x$ and $y$?

### 解答

Let $x$ be the age of the $10$s digit child and $y$ be the age of the $1$s digit child. We know that the age of the grandmother is $10x + y$. Therefore, the sum of all of their ages is $11x + 2y$. Thus, $11x + 2y = 98$. We know that each of $x$ and $y$ need to be an integer between $1$ and $9$, inclusive of both, as the age of each child is a digit. Since $11x + 2y = 98$, we need $x$ to be large, as it has a significantly larger coefficient. 

$$$$

Consider $x = 7, 8, 9$. For $x = 7$, $2y = 21$, which means $y$ is larger than $10$. Therefore, this does not work. If $x = 8,$ then $2y = 10$, in which case $y = 5$. This is a possibility. If $x = 9$, then $2y = -1$, meaning $y$ is negative (and also not an integer), so this is impossible. Therefore, $x = 8$ and $y = 5$, so the age of the grandmother is $85$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "85"
    ],
    "difficulty": "easy",
    "id": "yr0K1pGbRk5gtFGLCMVy",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4114343,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Family Ties",
    "topic": "brainteasers",
    "urlEnding": "family-ties"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "yr0K1pGbRk5gtFGLCMVy",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Family Ties",
    "topic": "brainteasers",
    "urlEnding": "family-ties"
  }
}
```
