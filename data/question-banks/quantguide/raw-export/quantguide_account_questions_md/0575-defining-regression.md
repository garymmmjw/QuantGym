# QuantGuide Question

## 575. Defining Regression

**Metadata**

- ID: `hhWywIco3GsZW0jBv1sK`
- URL: https://www.quantguide.io/questions/defining-regression
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-29 10:05:42 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ and $Y$ be random variables such that $E[X]=6, V[X] = 2, E[Y] = 8, V[Y] = 10,$ and $Cov[X,Y]=0$. Suppose you do a simple linear regression of $X$ on $Y$ that results in a model of $Y = aX + b$. What is $a+b$?

### Hint

Recall the maximum likelihood estimators for slope and y-intercept parameters. Which is a function of covariance, and how will that help you determine the other parameter's value?

### 解答

The covariance between the $X$ and $Y$ is zero, and thus $a$ is 0. The y-intercept of the regression is thus $E[Y]$, so $b$ is 8. In conclusion, $a+b=8$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "hhWywIco3GsZW0jBv1sK",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 10:05:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4610495,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Defining Regression",
    "topic": "statistics",
    "urlEnding": "defining-regression",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "hhWywIco3GsZW0jBv1sK",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Defining Regression",
    "topic": "statistics",
    "urlEnding": "defining-regression"
  }
}
```
