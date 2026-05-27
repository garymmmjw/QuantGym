# QuantGuide Question

## 143. Stack Double

**Metadata**

- ID: `UlaxEdl0fIUyTknHZmak`
- URL: https://www.quantguide.io/questions/stack-double
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: 536 q8
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

$$7$ men labeled $A-G$ play a coin flip game that starts with player $A$. At each turn, the player will flip a coin. If it appears heads, then the player must double the stack of each other player that plays the game, taking the money from their own stack. In other words, the payout to each of the other $6$ players is the value of their current stack. Otherwise, nothing happens. The sequence $HHHHHHH$ is observed and each of the $7$ players ends up with $\$1.28$ as their final stack. If $x_1,\dots,x_7$ represent the amount that each player started with, find the value of $10000(x_1^2 + \dots + x_7^2)$. For example, if player $A$ starts with $\$5.31$, then $x_1 = 5.31$.

### Hint

If the player is the $i$th to flip the coin, his money will be doubled $7-i$ times after he flips. Therefore, after obtaining his heads and paying out the sum to each of the other players, the $i$th player to flip must have $\dfrac{1.28}{2^{7-i}}$ in the bank. Furthermore, note that there is always $\$1.28 \cdot 7 = \$8.96$ in the game at all turns.

### 解答

The trick here is to really work backwards. Note that if the player is the $i$th to flip the coin, his money will be doubled $7-i$ times after he flips. Therefore, after obtaining his heads and paying out the sum to each of the other players, the $i$th player to flip must have $\dfrac{1.28}{2^{7-i}}$ in the bank. Furthermore, note that there is always $\$1.28 \cdot 7 = \$8.96$ in the game at all turns.

$$$$

Starting with player $A$, this means player $A$ must have $2$ cents in the bank after he flips. This means that $x_1 - (8.96 - x_1) = 0.02$, as $x_1$ is what he had before the flip and $8.96 - x_1$ is what he pays out. Solving this yields $x_1 = 4.49$. For player $B$, we are going to calculate what he has right before he pays out everyone. We didn't need to worry about this when calculating $x_1$ as there was nobody before player $A$. 

$$$$

If $p_2$ is what player $B$ has right before paying out, then $p_2 - (8.96 - p_2) = 0.04$, meaning $p_2 = 4.50$. Since player $B$ has his money doubled once already, this means $x_2 = 2.25$. 

$$$$

More generally, if $p_k$ is what the $k$th person to flip had in their bank right before paying out, $p_k - (8.96 - p_k) = 1.28 \cdot 2^{-(7-k)}$, meaning that $$p_k = \dfrac{1.28 \cdot 2^{-(7-k)} + 8.96}{2}$$ However, this person already had their money doubled $k-1$ times from the $k-1$ people that came before them, so this implies that $$x_k = \dfrac{1.28 \cdot 2^{-(7-k)} + 8.96}{2^k}$$ Plugging in $k = 1,2,\dots, 7$ yields that $$x_1 = 4.49, x_2 = 2.25, x_3 = 1.13, x_4 = 0.57, x_5 = 0.29, x_6 = 0.15, x_7 = 0.08$$

Adding the squared values up and multiplying by $10000$ yields the result of $269374$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "269374"
    ],
    "companies": [],
    "difficulty": "hard",
    "id": "UlaxEdl0fIUyTknHZmak",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 1027142,
    "source": "536 q8",
    "status": "published",
    "tags": [],
    "title": "Stack Double",
    "topic": "brainteasers",
    "urlEnding": "stack-double"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "UlaxEdl0fIUyTknHZmak",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Stack Double",
    "topic": "brainteasers",
    "urlEnding": "stack-double"
  }
}
```
