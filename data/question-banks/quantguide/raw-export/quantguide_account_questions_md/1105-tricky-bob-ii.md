# QuantGuide Question

## 1105. Tricky Bob II

**Metadata**

- ID: `4wBrxQsjFvAZLsnlSQNk`
- URL: https://www.quantguide.io/questions/tricky-bob-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Optiver
- Source: N/A
- Tags: Conditional Probability, Games
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:16:49 America/New_York
- Last Edited By: Gabe

### 题干

Alice and Bob are each given a coin. Each is allowed decide the probability of heads for their coin. Afterwards, they both flip their coins. If it comes up $HH$, Alice gives Bob $\$6$. If it comes up $TT$, Alice gives Bob $\$4$. Otherwise, Bob gives Alice $\$5$. However, Alice must tell Bob the success probability $p_1$ they have chosen before Bob decides. Suppose $p_1 = \dfrac{3}{4}$. The range of probabilities $p_2$ for which Bob has positive expected value on the game is in the form $(a,1)$, where $a$ is a fraction in reduced form. Find $a$.

### Hint

Call Bob's success probability $p_2$. Write out the expected value as a function of $p_1$ and $p_2$. Then, solve for $p_2$ in terms of $p_1$ as an inequality.

### 解答

Call Bob's success probability $p_2$. Let's write out the expected value as a function of $p_1$ and $p_2$. The probability of $HH$ is $p_1p_2$. The probability of $TT$ is $(1-p_1)(1-p_2)$. The probability of $TH$ or $HT$ is $p_1(1-p_2) + p_2(1-p_1) = p_1 + p_2 - 2p_1p_2$. From Bob's perspective, the respective profits for each of these outcomes are $6,4,$ and $-5$. Therefore, the expected value is $6p_1p_2 + 4(1-p_1)(1-p_2) - 5(p_1 + p_2 - 2p_1p_2) = 6p_1p_2 + 4 - 4p_1 - 4p_2 + 4p_1p_2 -5 p_1 - 5p_2 + 10p_1p_2 = 20p_1p_2 - 9p_2 - 9p_1 + 4$. Factoring this a little bit, we have that this becomes $(20p_1 - 9)p_2 + (4 - 9p_1)$.

$$$$

Now, assuming that $p_1 \neq \dfrac{9}{20}$ (so that we can rearrange and divide), we get that $p_2 > \dfrac{9p_1 - 4}{20p_1 - 9}$. Letting $p_1 = \dfrac{3}{4}$, we have that $p_2 > \dfrac{11}{24}$, so this is our answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11/24"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "4wBrxQsjFvAZLsnlSQNk",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:16:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9051959,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Tricky Bob II",
    "topic": "probability",
    "urlEnding": "tricky-bob-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "id": "4wBrxQsjFvAZLsnlSQNk",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Tricky Bob II",
    "topic": "probability",
    "urlEnding": "tricky-bob-ii"
  }
}
```
