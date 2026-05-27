# QuantGuide Question

## 609. Ranged Stars and Bars

**Metadata**

- ID: `fJ2IcSBY4WdbBqDyiA1e`
- URL: https://www.quantguide.io/questions/ranged-stars-and-bars
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Five Rings
- Source: jhu prob edited
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-5 09:50:18 America/New_York
- Last Edited By: Gabe

### 题干

Find the number of non-negative integer solutions to $6 \leq x_1 + \dots + x_5 \leq 10$.

### Hint

We know by stars and bars that for a fixed $k$, the number of non-negative integer solutions to $x_1 + \dots + x_n = k$ is $\displaystyle \binom{n+k-1}{n-1}$. Use the hockey stick identity $\displaystyle \sum_{i=k-1}^{r-1} \binom{i}{k-1} = \binom{r}{k}$, $1 \leq k < r$.

### 解答

We are going to solve this problem more generally. Namely, we want to find the number of non-negative integer solutions to $$n+1 \leq x_1  + \dots + x_n \leq 2n$$ We know by stars and bars that for a fixed $k$, the number of non-negative integer solutions to $x_1 + \dots + x_n = k$ is $\displaystyle \binom{n+k-1}{n-1}$. Therefore, the number of non-negative integer solutions to $x_1 + \dots + x_n \leq 2n$ is just the sum of the number of non-negative integer solutions to $x_1 + \dots + x_n = k$ for $0 \leq k \leq 2n$, so this yields $$\displaystyle \binom{n-1}{n-1} + \dots + \binom{2n-1}{n-1}  + \binom{2n}{n-1} + \dots + \binom{3n-1}{n-1}$$ Using the hockey stick identity $\displaystyle \sum_{i=k-1}^{r-1} \binom{i}{k-1} = \binom{r}{k}$, $1 \leq k < r$, with $k = n$ and $r = 3n$, we get that the above is just $\displaystyle \binom{3n}{n}$. We do similar to find that the number of non-negative integer solutions to $x_1 + \dots + x_n \leq n$ is $$\binom{n-1}{n-1} + \dots + \binom{2n-1}{n-1} = \binom{2n}{n}$$ Therefore, the number of non-negative integer solutions to $n+1 \leq x_1 + \dots + x_n \leq 2n$ is just the difference of the above values, as $x_1 + \dots + x_n \leq 2n$ includes solutions that are also $\leq n$. Therefore, the number solutions to this is $$\binom{2n}{n-1} + \dots + \binom{3n-1}{n-1} = \binom{3n}{n} - \binom{2n}{n}$$ Plugging in $n = 5$ yields that our answer is $\displaystyle \binom{15}{5} - \binom{10}{5} = 2751$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2751"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "fJ2IcSBY4WdbBqDyiA1e",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 09:50:18 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4833618,
    "randomizable": "",
    "source": "jhu prob edited",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Ranged Stars and Bars",
    "topic": "probability",
    "urlEnding": "ranged-stars-and-bars",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "hard",
    "id": "fJ2IcSBY4WdbBqDyiA1e",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Ranged Stars and Bars",
    "topic": "probability",
    "urlEnding": "ranged-stars-and-bars"
  }
}
```
