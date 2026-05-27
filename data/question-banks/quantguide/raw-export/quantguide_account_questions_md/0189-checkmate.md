# QuantGuide Question

## 189. Checkmate

**Metadata**

- ID: `nwFyN1F5aTo1WKz9XcEH`
- URL: https://www.quantguide.io/questions/checkmate
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: DRW
- Source: N/A
- Tags: Games, Conditional Probability
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 21:38:35 America/New_York
- Last Edited By: Gabe

### 题干

Andy is playing chess. In order to receive a prize, he must win at least two consecutive games out of three. Andy may either play Michael, then Aaron, then Michael (option 1), or he may play Aaron, then Michael, then Aaron (option 2). Aaron is better at chess than Michael. Which option, 1 or 2, should Andy pick in order to maximize his chances at receiving a prize?

### Hint

Let $m$ denote the probability that Andy wins a game against Michael, and let $a$ denote the probability that Andy wins a game against Aaron. Since Aaron is better than Michael, we assume $a < m \Rightarrow m - a > 0$. In order to receive a prize, Andy can either win the first two games, or he can lose the first game and win the next two games. How can you set up equations to compare $\mathbb{P}(\text{Andy receives prize} \,|\, \text{option 1})$ and $\mathbb{P}(\text{Andy receives prize} \,|\, \text{option 2})$?

### 解答

Let $m$ denote the probability that Andy wins a game against Michael, and let $a$ denote the probability that Andy wins a game against Aaron. Since Aaron is better than Michael, we assume $a < m \Rightarrow m - a > 0$. In order to receive a prize, Andy can either win the first two games, or he can lose the first game and with the next two games. For option 1, the probability that Andy receives a prize can be written as
\[
\begin{aligned}
\mathbb{P}(\text{Andy receives prize} \,|\, \text{option 1}) &= m \cdot a + (1 - m) \cdot a \cdot m
\end{aligned}
\] 
And for option 2, we have
\[
\begin{aligned}
\mathbb{P}(\text{Andy receives prize} \,|\, \text{option 2}) &= a \cdot m + (1 - a) \cdot m \cdot a
\end{aligned}
\] 
Note the following:
\[
\begin{aligned}
&\quad \mathbb{P}(\text{Andy receives prize} \,|\, \text{option 2}) - \mathbb{P}(\text{Andy receives prize} \,|\, \text{option 1}) \\
&= \left[ (1 - a) - (1 - m) \right] am \\
&= (m - a) am > 0
\end{aligned}
\] 
Therefore, we conclude that $\mathbb{P}(\text{Andy receives prize} \,|\, \text{option 2})$ is greater than $\mathbb{P}(\text{Andy receives prize} \,|\, \text{option 1})$. Andy should pick option 2. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "nwFyN1F5aTo1WKz9XcEH",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 21:38:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1459506,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Checkmate",
    "topic": "probability",
    "urlEnding": "checkmate"
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "medium",
    "id": "nwFyN1F5aTo1WKz9XcEH",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Checkmate",
    "topic": "probability",
    "urlEnding": "checkmate"
  }
}
```
