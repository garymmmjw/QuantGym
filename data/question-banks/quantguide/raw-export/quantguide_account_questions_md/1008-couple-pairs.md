# QuantGuide Question

## 1008. Couple Pairs

**Metadata**

- ID: `5louCUBEOuSDA9ig3qRA`
- URL: https://www.quantguide.io/questions/couple-pairs
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: prob hw, edited
- Tags: Combinatorics, Conditional Probability, Events
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-1 10:45:24 America/New_York
- Last Edited By: Gabe

### 题干

3 heterosexual couples ($6$ people) are having a nice dinner. The $6$ people are randomly paired up with no restrictions. Find the probability at least one of the couples are paired up together.

### Hint

Label the couples $1-3$, and let $C_i$ represent the event that couple $i$ is paired up together. We want $\mathbb{P}[C_1 \cup C_2 \cup C_3]$ By the inclusion-exclusion formula and the fact that the couples are exchangeable, $$\mathbb{P}[C_1 \cup C_2 \cup C_3] = 3 \mathbb{P}[C_1] - 3\mathbb{P}[C_1 \cap C_2] + \mathbb{P}[C_1 \cap C_2 \cap C_3]$$

### 解答

Label the couples $1-3$, and let $C_i$ represent the event that couple $i$ is paired up together. We want $\mathbb{P}[C_1 \cup C_2 \cup C_3]$ By the inclusion-exclusion formula and the fact that the couples are exchangeable, $$\mathbb{P}[C_1 \cup C_2 \cup C_3] = 3 \mathbb{P}[C_1] - 3\mathbb{P}[C_1 \cap C_2] + \mathbb{P}[C_1 \cap C_2 \cap C_3]$$ $\mathbb{P}[C_1]$ is just the probability couple $1$ is paired up. Fix one person in couple $1$. Then exactly $1$ of the $5$ remaining people is that person's actual partner, so this probability is just $\dfrac{1}{5}$. Note that $\mathbb{P}[C_1 \cap C_2] = \mathbb{P}[C_1 \cap C_2 \cap C_3]$, as if two of the couples are matched together, the third also will be by default. Therefore, we can compute $\mathbb{P}[C_1 \cap C_2] = \mathbb{P}[C_2 \mid C_1]\mathbb{P}[C_1]$. We have $\mathbb{P}[C_1]$ from before. Then, given the first couple is matched, fix any other person. Then $1$ of the $3$ remaining people will be the partner of that person so $\mathbb{P}[C_2 \mid C_1] = \dfrac{1}{3}$, so $\mathbb{P}[C_1 \cap C_2] = \dfrac{1}{15}$. Combining all of this into the our initial inclusion-exclusion, we have that $$\mathbb{P}[C_1 \cup C_2 \cup C_3] = 3 \cdot \dfrac{3}{15} - 3 \cdot \dfrac{1}{15} + \dfrac{1}{15} = \dfrac{7}{15}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7/15"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "5louCUBEOuSDA9ig3qRA",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-1 10:45:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8197511,
    "source": "prob hw, edited",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Couple Pairs",
    "topic": "probability",
    "urlEnding": "couple-pairs",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "5louCUBEOuSDA9ig3qRA",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Couple Pairs",
    "topic": "probability",
    "urlEnding": "couple-pairs"
  }
}
```
