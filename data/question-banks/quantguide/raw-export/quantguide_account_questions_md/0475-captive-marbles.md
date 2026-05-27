# QuantGuide Question

## 475. Captive Marbles

**Metadata**

- ID: `3bxc4AEmoQoeRVGdLsOS`
- URL: https://www.quantguide.io/questions/captive-marbles
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Flow Traders, Akuna, Chicago Trading Company, Belvedere Trading
- Source: Green Book (?)
- Tags: Games
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-7 13:33:20 America/New_York
- Last Edited By: Gabe

### 题干

You are on death row presently. The judge offers you the following game: You have $50$ white balls, $50$ black balls, and $2$ empty urns in front of you. You can distribute all $100$ balls between the $2$ urns in any way you please. Then, you are blindfolded and must pick one of the urns to select a ball from. If you pick a white ball, you are free. However, you are executed on the spot if you draw a black ball. Assuming optimal strategy, what is your chance of survival?

### Hint

If the bowls are not perfectly balanced, then we know that one of the bowls must have a larger than $0.5$ probability of you drawing a white ball while the other has less than a $0.5$ probability. Taking this to the extreme, the best case is that one of the bowls has probability $1$ of you surviving and the other has probability $0.5$ of you surviving, which yields a $75\%$ chance of survival.

### 解答

If the bowls are not perfectly balanced, then we know that one of the bowls must have a larger than $0.5$ probability of you drawing a white ball while the other has less than a $0.5$ probability. Taking this to the extreme, the best case is that one of the bowls has probability $1$ of you surviving and the other has probability $0.5$ of you surviving, which yields a $75\%$ chance of survival. The closest we can get to this is by putting $1$ white marble in one of the urns and then the other $99$ marbles in the other urn. This gives you probability $1$ of survival in one urn and $\dfrac{49}{99}$ probability in the other. This is as close as we can get to the theoretical optimum, so the probability of survival here is $$\dfrac{1}{2} \cdot 1 + \dfrac{1}{2} \cdot \dfrac{49}{99} = \dfrac{74}{99}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "74/99"
    ],
    "companies": [
      {
        "company": "Flow Traders"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "3bxc4AEmoQoeRVGdLsOS",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:33:20 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3783658,
    "randomizable": "",
    "source": "Green Book (?)",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Captive Marbles",
    "topic": "probability",
    "urlEnding": "captive-marbles",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Flow Traders"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "id": "3bxc4AEmoQoeRVGdLsOS",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Captive Marbles",
    "topic": "probability",
    "urlEnding": "captive-marbles"
  }
}
```
