# QuantGuide Question

## 461. Pick Your Urn Wisely

**Metadata**

- ID: `kDxSeA24I7fB9XgLfrT0`
- URL: https://www.quantguide.io/questions/pick-your-urn-wisely
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG, Jane Street, DRW, Valkyrie Trading
- Source: SIG
- Tags: Expected Value, Games
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-13 19:53:12 America/New_York
- Last Edited By: Gabe

### 题干

You have 2 indistinguishable urns in front of you. One of the urns has $4$ $\$1$ chips and $6$ $\$10$ chips. The other urn has $3$ $\$1$ chips and $7$ $\$10$ chips. You reach into one urn at random and select a $\$1$ chip. You are given the opportunity to pick another chip at random either from same urn as the first chip or at random from the other urn. Your payout is the value of the second chip you select. Under optimal gameplay, what is your expected payout?

### Hint

Calculate the expected payout if you switch urns versus if you stay with your current urn. For notational purposes, let urn 1 be the urn that started with $4$ $\$1$ chips and urn 2 be the one that started with $3$. Define the random variable $X$ as the urn that you selected your first chip from. We can say that $\mathbb{P}[X = 1] = \dfrac{4}{3}\mathbb{P}[X = 2]$ as urn 1 started with $4$ $\$1$ chips. Therefore, as those 2 values must sum to $1$, $\mathbb{P}[X = 1] = \dfrac{4}{7}$ and $\mathbb{P}[X = 2] = \dfrac{3}{7}$.

### 解答

Lets calculate the expected payout if you switch urns versus if you stay with your current urn. For notational purposes, let urn 1 be the urn that started with $4$ $\$1$ chips and urn 2 be the one that started with $3$. Define the random variable $X$ as the urn that you selected your first chip from. We can say that $\mathbb{P}[X = 1] = \dfrac{4}{3}\mathbb{P}[X = 2]$ as urn 1 started with $4$ $\$1$ chips. Therefore, as those 2 values must sum to $1$, $\mathbb{P}[X = 1] = \dfrac{4}{7}$ and $\mathbb{P}[X = 2] = \dfrac{3}{7}$.

$$$$

Let $P_0$ be the payout if we stay with the same urn. If we don't switch, then $\mathbb{E}[P_0] = \mathbb{E}[P_0 \mid X = 1]\mathbb{P}[X = 1] + \mathbb{E}[P_0 \mid X = 2]\mathbb{P}[X = 2]$. If $X = 1$, then after drawing one $\$1$ chip, there are $6$ $\$10$ and $3$ $\$1$ chips left, so $\mathbb{E}[P_0 \mid X = 1] = \dfrac{63}{9} = 7$. Similarly, there would be $7$ $\$10$ and $2$ $\$1$ chips after the first draw if $X = 2$, so $\mathbb{E}[P_0 \mid X = 2]  = \dfrac{72}{9} = 8$. Plugging these values in yields $$\mathbb{E}[P_0] = 7 \cdot \dfrac{4}{7} + 8 \cdot \dfrac{3}{7} = \dfrac{52}{7}$$

$$$$

Let $P_1$ be your profit if you switch. Similarly, we have $\mathbb{E}[P_1] = \mathbb{E}[P_1 \mid X = 1]\mathbb{P}[X = 1] + \mathbb{E}[P_1 \mid X = 2]\mathbb{P}[X = 2]$. If $X = 1$, then by switching, we pick from an untouched urn 2, so $\mathbb{E}[P_1 \mid  X = 1] = \dfrac{73}{10} = 7.3$. Similarly, if $X = 2$, then we pick from an untouched urn 1, so $\mathbb{E}[P_1 \mid X = 2] = \dfrac{64}{10} = 6.4$. Therefore, $$\mathbb{E}[P_1] = 6.4 \cdot \dfrac{3}{7} + 7.3 \cdot \dfrac{4}{7} = \dfrac{242}{35} < \dfrac{245}{35} = 7$$ Therefore, you should not switch, and your expected payout is $\dfrac{52}{7}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "52/7"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Valkyrie Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "kDxSeA24I7fB9XgLfrT0",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-13 19:53:12 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3700463,
    "source": "SIG",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Pick Your Urn Wisely",
    "topic": "probability",
    "urlEnding": "pick-your-urn-wisely",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Valkyrie Trading"
      }
    ],
    "difficulty": "medium",
    "id": "kDxSeA24I7fB9XgLfrT0",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Pick Your Urn Wisely",
    "topic": "probability",
    "urlEnding": "pick-your-urn-wisely"
  }
}
```
