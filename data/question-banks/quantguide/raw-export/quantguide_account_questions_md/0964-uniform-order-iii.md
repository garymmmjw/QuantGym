# QuantGuide Question

## 964. Uniform Order III

**Metadata**

- ID: `QSRsVBTLYVyNR5TtKSaF`
- URL: https://www.quantguide.io/questions/uniform-order-iii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: og
- Tags: Conditional Probability, Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-19 12:47:14 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,\dots,X_{20}$ be IID Unif$(0,1)$ random variables. Compute $$\mathbb{P}[X_{16} = \text{min}\{X_1,\dots,X_{16}\} \mid X_1 = \text{max}\{X_1,\dots,X_{16}\}, X_{17} < X_{18}]$$

### Hint

Does the ordering of $X_{17}$ and $X_{18}$ matter? Consider conditional probability formula or writing out $16$ blanks.

### 解答

There is quite a bit going on here, so we need to decipher what this probability statement is really saying and how we can simplify it. We want the conditional probability that $X_{16}$ is the smallest of the first $16$ random variables given that $X_1$ is the largest of the first $16$ and that $X_{17} < X_{18}$. Note that each of the random variables are IID, so the ordering of $X_{17}$ and $X_{18}$ with respect to each other has no bearing on the ordering of the first $16$ random variables in the sequence. Therefore, $$\mathbb{P}[X_{16} = \text{min}\{X_1,\dots,X_{16}\} \mid X_1 = \text{max}\{X_1,\dots,X_{16}\}, X_{17} < X_{18}] = \mathbb{P}[X_{16} = \text{min}\{X_1,\dots,X_{16}\} \mid X_1 = \text{max}\{X_1,\dots,X_{16}\}]$$ as that information does not tell us anything about our probability of interest. $$$$Consider $16$ blanks corresponds to the largest to smallest random variables. We know that $X_{1}$ goes in the first spot because it is known to be the maximum of the first $16$ random variables. Thus, there are $15$ random variables left to arrange to the other $15$ blanks, and we want the probability $X_{16}$ goes in the last spot. Since the other 15 random variables are exchangeable, it is no more likely that $X_{16}$ goes in the last spot than any of $X_2,\dots, X_{15}$, so the probability is just $\dfrac{1}{15}$. The key thing to notice in this question is that the ordering of random variables not in the subset of random variables we consider is irrelevant by the independence of the random variables.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/15"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "QSRsVBTLYVyNR5TtKSaF",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-19 12:47:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7861098,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Uniform Order III",
    "topic": "probability",
    "urlEnding": "uniform-order-iii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "QSRsVBTLYVyNR5TtKSaF",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Uniform Order III",
    "topic": "probability",
    "urlEnding": "uniform-order-iii"
  }
}
```
