# QuantGuide Question

## 543. Tricky Bob I

**Metadata**

- ID: `oOxGT2SgrZDpMLUvnTdI`
- URL: https://www.quantguide.io/questions/tricky-bob-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Optiver
- Source: N/A
- Tags: Conditional Probability, Games
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-4 20:28:16 America/New_York
- Last Edited By: Gabe

### 题干

Bob proposes a game where Alice and Bob are each given a coin. Each is allowed decide the probability of heads for their coin. Afterwards, they both flip their coins. If it comes up $HH$, Alice gives Bob $\$6$. If it comes up $TT$, Alice gives Bob $\$4$. Otherwise, Bob gives Alice $\$5$. However, Alice must tell Bob the success probability $p_1$ they have chosen before Bob decides his $p_2$. The interval of values for $p_1$ such that regardless of what Bob selects, Bob has non-positive expected value on the game is in the form $[a,b]$, where $a$ and $b$ are rational numbers. Find $b-a$.

### Hint

Call Bob's success probability $p_2$. Write out the expected value as a function of $p_1$ and $p_2$. For what values of $p_1$ does $p_2$ need to be larger than $1$ to obtain a positive expected value?

### 解答

Call Bob's success probability $p_2$. Let's write out the expected value as a function of $p_1$ and $p_2$. The probability of $HH$ is $p_1p_2$. The probability of $TT$ is $(1-p_1)(1-p_2)$. The probability of $TH$ or $HT$ is $p_1(1-p_2) + p_2(1-p_1) = p_1 + p_2 - 2p_1p_2$. From Bob's perspective, the respective profits for each of these outcomes are $6,4,$ and $-5$. Therefore, the expected value is $6p_1p_2 + 4(1-p_1)(1-p_2) - 5(p_1 + p_2 - 2p_1p_2) = 6p_1p_2 + 4 - 4p_1 - 4p_2 + 4p_1p_2 -5 p_1 - 5p_2 + 10p_1p_2 = 20p_1p_2 - 9p_2 - 9p_1 + 4$. Factoring, this becomes $(20p_1 - 9)p_2 + (4 - 9p_1)$.

$$$$

Now, assuming that $p_1 \neq \dfrac{9}{20}$ (such that we can rearrange and divide), we see that $p_2 > \dfrac{9p_1 - 4}{20p_1 - 9}$. The RHS is $0$ when $p_1 = \dfrac{4}{9}$, as the numerator vanishes. In addition, let's find when the RHS is at least $1$. This implies $9p_1 - 4 \geq 20p_1 - 9$, which means that $p_1 \leq \dfrac{5}{11}$. One can verify that the expected value in this case (by plugging into the expected value equation previously) is $p_2 - 1$. However, as a probability is at most one $1$, unless $p_2 = 1$, Bob has a strictly negative expected value. Similarly, by plugging in $p_1 = \dfrac{4}{9}$, one can find the expected value to be $-p_2$. Therefore, unless $p_2 = 0$, Bob once again has a strictly negative expected value. Therefore, $a = \dfrac{4}{9}$ and $b = \dfrac{5}{11}$, so $b-a = \dfrac{1}{99}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/99"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "oOxGT2SgrZDpMLUvnTdI",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 20:28:16 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4346321,
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
    "title": "Tricky Bob I",
    "topic": "probability",
    "urlEnding": "tricky-bob-i",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "id": "oOxGT2SgrZDpMLUvnTdI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Tricky Bob I",
    "topic": "probability",
    "urlEnding": "tricky-bob-i"
  }
}
```
