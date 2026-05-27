# QuantGuide Question

## 1110. Optimizing Aces

**Metadata**

- ID: `w3DicS7QkivGtUeaIM3N`
- URL: https://www.quantguide.io/questions/optimizing-aces
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: N/A
- Tags: Games
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:31:34 America/New_York
- Last Edited By: Gabe

### 题干

Aaron picks an integer $k \in [1, 52]$. Then, he draws the first $k$ cards from a standard, shuffled 52-card deck. Aaron wins a prize if the last card he draws is an ace and if there exists exactly one ace in the remaining cards. What $k$ should Aaron pick? 

### Hint

Consider an ordering of $52$ cards. In order for Aaron to win a prize, (1) the $k$-th card must be an ace, (2) there must be exactly two aces in the first $k-1$ cards, and (3) there must be exactly one ace in the last $52-k$ cards.

### 解答

Consider an ordering of $52$ cards. In order for Aaron to win a prize, (1) the $k$-th card must be an ace, (2) there must be exactly two aces in the first $k-1$ cards, and (3) there must be exactly one ace in the last $52-k$ cards. Treating all cards as distinguishable, we find the following function of $k$ that describes the probability that Aaron wins a prize.
\[\begin{aligned}
\mathbb{P}(\text{Aaron wins}) &= \frac{\binom{k-1}{2} \binom{52-k}{1} 4! 48!}{52!} \\
&= \frac{12 \cdot 48! \cdot (52 - k)(k - 1)(k - 2)}{52!}
\end{aligned}\]
We arrive at the above expression as follows: (1) choose two cards to assign as aces from the first $k-1$ cards, (2) assign the $k$-th card as an ace, (3) choose one card to assign as an ace from last $52 - k$ cards, and finally, (3) there are $4!$ ways to order the four distinguishable aces among the four allotted ace slots. Now, we have a simple optimization problem:
\[\begin{aligned}
k_\text{optimal} &= \underset{k \in \{1, \ldots, 52\}}{\text{arg max}} \left\{ \mathbb{P}(\text{Aaron wins}) \right\} \\
&= \underset{k \in \{1, \ldots, 52\}}{\text{arg max}} \left\{ \frac{12 \cdot 48! \cdot (52 - k)(k - 1)(k - 2)}{52!} \right\}
\end{aligned}\]
Let's take the derivative of $\mathbb{P}(\text{Aaron wins})$ with respect to $k$, set it to $0$, and solve for $k$. 
\[\begin{aligned}
\frac{d}{d k} \frac{12 \cdot 48! \cdot (52 - k)(k - 1)(k - 2)}{52!} &= 0 \\
\end{aligned}\]
Diving out the constants and simplifying, we find
\[\begin{aligned}
\frac{d}{d k} \left( -k^3 + 55k^2 - 158k +104 \right) &= 0\\
\Rightarrow 3k^2 - 110k + 158 &= 0
\end{aligned}\]
Solving for k, we find
\[\begin{aligned}
k &= \frac{55}{3} \pm \frac{\sqrt{2551}}{3}
\end{aligned}\]
Note that $k$ cannot equal $\frac{55}{3} - \frac{\sqrt{2551}}{3} < 2$. Additionally, $k$ must be an integer, and $35 < \frac{55}{3} +\frac{\sqrt{2551}}{3} < 36$. Testing both $k = 35$ and $k = 36$, we find that $k = 35$ achieves the greatest probability for Aaron to win a prize.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "35"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "w3DicS7QkivGtUeaIM3N",
    "internalDifficulty": 4,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:31:34 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9067839,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Optimizing Aces",
    "topic": "probability",
    "urlEnding": "optimizing-aces"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "w3DicS7QkivGtUeaIM3N",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Optimizing Aces",
    "topic": "probability",
    "urlEnding": "optimizing-aces"
  }
}
```
