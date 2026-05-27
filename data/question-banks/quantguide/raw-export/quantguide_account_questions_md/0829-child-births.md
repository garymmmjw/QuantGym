# QuantGuide Question

## 829. Child Births

**Metadata**

- ID: `8Aa63bmoStidetYzoHst`
- URL: https://www.quantguide.io/questions/child-births
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 15:56:55 America/New_York
- Last Edited By: Gabe

### 题干

We suppose that the number of children that a family has in the USA is $N \sim \text{Poisson}(\lambda)$ for some $\lambda$. We prescribe a prior distribution of $\lambda \sim \text{Gamma}(32,10)$ to the distribution, where we use the Shape-Rate parameterization. We then observe $34$ families who have a total of $100$ kids combined. Find the posterior mean for $\lambda$.

### Hint

If $n$ is the number of samples we observed in our data collection and $\displaystyle \sum_{i=1}^n x_i = N$, where $x_i$ is the value associated with the $i$th sample, then for a prior distribution of $\text{Gamma}(a,b)$, our posterior mean is $$\dfrac{a + \displaystyle \sum_{i=1}^n x_i}{b + n}$$

### 解答

If $n$ is the number of samples we observed in our data collection and $\displaystyle \sum_{i=1}^n x_i = N$, where $x_i$ is the value associated with the $i$th sample, then for a prior distribution of $\text{Gamma}(a,b)$, our posterior mean is $$\dfrac{a + \displaystyle \sum_{i=1}^n x_i}{b + n}$$ In this case, $n =34$ and $\displaystyle \sum_{i=1}^{34} x_i = 100$, so we get that our posterior mean is $\dfrac{32 + 100}{10 + 34} = 3$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "8Aa63bmoStidetYzoHst",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 15:56:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6811604,
    "randomizable": "",
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Child Births",
    "topic": "statistics",
    "urlEnding": "child-births",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "8Aa63bmoStidetYzoHst",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Child Births",
    "topic": "statistics",
    "urlEnding": "child-births"
  }
}
```
