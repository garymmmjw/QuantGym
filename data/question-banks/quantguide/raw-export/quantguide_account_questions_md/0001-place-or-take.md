# QuantGuide Question

## 1. Place or Take

**Metadata**

- ID: `pjSCKiq39SvESirmwFq4`
- URL: https://www.quantguide.io/questions/place-or-take
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: Jane Street
- Source: Jane Street
- Tags: Games, Expected Value
- Premium: False
- Solution Free: True
- Version: 2
- Last Edited: 2023-9-28 20:28:35 America/New_York
- Last Edited By: Gabe

### 题干

You are playing a one-player game with two opaque boxes. At each turn, you can choose to either "place" or "take". "Place" places $\$$1 from a third party into one box randomly. "Take" empties out one box randomly and that money is yours. This game consists of 100 turns where you must either place or take. Assuming optimal play, what is the expected payoff of this game? Note that you do not know how much money you have taken until the end of the game.

### Hint

There are two aspects to this game that should be noted: the ordering of the places and takes, and the number of places and takes. We can tackle the former aspect first. Intuitively, no places should come after a take. Greedily so, you might as well put a take after all places such that you have a higher expected value of that take (considering a single take, every place you put after the take is $\$$1 less that could be taken); thus, all takes should be stacked at the end of the 100 turns. This can also be proved with induction, and this will be left as an exercise to the reader. The next aspect is regarding the number of places and takes.

### 解答

There are two aspects to this game that should be noted: the ordering of the places and takes, and the number of places and takes. We can tackle the former aspect first. Intuitively, no places should come after a take. Greedily so, you might as well put a take after all places such that you have a higher expected value of that take (considering a single take, every place you put after the take is $\$$1 less that could be taken); thus, all takes should be stacked at the end of the 100 turns. This can also be proved with induction, and this will be left as an exercise to the reader. The next aspect is regarding the number of places and takes. If there are $p$ places, then there must be $100-p$ takes, and we know that the $p$ places must occur before the $100-p$ takes. In order to find the value of $p$, we can calculate at what position does adding an additional place action not improve our expected payoff. Consider the $p$-th action where $1 < p < 100$ and where this is the last place before we begin taking, or the next action ($p+1$) will be the last pace before we begin taking. What is the expected value of the game if action $p$ is the last place? There are $p$ dollars in aggregate and we have $100-p$ takes. Our expected payoff will be $p \times \sum_{i=1} ^{100-p} \frac{1}{2^i}$, which can be seen from the linearity of expectation- at every take, we will take half of what is remaining on average. What is the expected value of the game if action $p+1$ is the last place? There are $p+1$ dollars in aggregate and we have $100-(p+1)$ takes. Thus, our expected payoff is $(p+1) \times \sum_{i=1} ^{100-p-1} \frac{1}{2^i}$. We are looking for the largest value of $p$ such that the payoff where the $p$-th place is the last place is greater the payoff where the incremental $p+1$-th place is the last place. Thus:$$p \sum_{i=1} ^{100-p} \frac{1}{2^i} > (p+1) \sum_{i=1} ^{100-p-1} \frac{1}{2^i}$$$$p \sum_{i=1} ^{100-p} \frac{1}{2^i} > p \sum_{i=1} ^{99-p} \frac{1}{2^i} + \sum_{i=1} ^{99-p} \frac{1}{2^i}$$$$\frac{p}{2^{100-p}} > \sum_{i=1} ^{99-p} \frac{1}{2^i}$$$\sum_{i=1} ^{99-p} \frac{1}{2^i}$ approaches 1, and thus $p > 2^{100-p} \Rightarrow p > 93$. With 94 places, the expected payoff is $94 \sum_{i=1} ^{6} \frac{1}{2^i} \approx 92.5$. To check this is the maximum payoff, we can look at the 93 and 95 placing cases. With 93 places, the expected payoff is $93 \sum_{i=1} ^{7} \frac{1}{2^i} \approx 92.3$. With 95 places, the expected payoff is $95 \sum_{i=1} ^{5} \frac{1}{2^i} \approx 92.0$. Both surrounding values are less than our expected payoff, and hence the optimal number of times we should place is 94 with an expected payoff of $\frac{2961}{32} \approx 92.5$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2961/32"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "pjSCKiq39SvESirmwFq4",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": true,
    "lastEditedAt": "2023-9-28 20:28:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 10,
    "source": "Jane Street",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Place or Take",
    "topic": "probability",
    "urlEnding": "place-or-take",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "id": "pjSCKiq39SvESirmwFq4",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Place or Take",
    "topic": "probability",
    "urlEnding": "place-or-take"
  }
}
```
