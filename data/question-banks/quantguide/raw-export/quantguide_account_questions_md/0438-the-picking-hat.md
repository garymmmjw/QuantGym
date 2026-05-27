# QuantGuide Question

## 438. The Picking Hat

**Metadata**

- ID: `4PPq98Sotm26F1Hb5Ejf`
- URL: https://www.quantguide.io/questions/the-picking-hat
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Jane Street, Akuna, Goldman Sachs
- Source: N/A
- Tags: Expected Value, Games
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-7 12:28:01 America/New_York
- Last Edited By: Gabe

### 题干

A hat contains the numbers 1-100. The rules to the game are as follows. Each round, AJ draws a number out of the hat, writes it down, and puts the number back in the hat. The last number written down is the number of dollars awarded to AJ. AJ may play as many rounds as he would like, but each round costs $\$1$. Assuming optimal play, what is the fair value of this game?

### Hint

Let's say AJ gets unlucky and draws a 5 on his first turn. Then, AJ should of course draw again, despite the $\$1$ penalty. But, if AJ gets lucky and draws a 70 on his first turn? An 80? Define a loss function where to determine an optimal threshold $x$, where, if AJ's draw is at least $x$, then he will not play another round.

### 解答

We want to determine an optimal threshold $x$, where, if AJ's draw is at least $x$, then he will not play another round. Notice that, if AJ draws again, without taking into consideration the $\$1$ penalty, then AJ's expected payoff is the same as the previous round. So, we can write the following expression, where $A$ denotes the total winnings. 
\[\begin{aligned}
\mathbb{E}[A] &= - 1 + \sum_{i = x}^{100} \frac{i}{100} + \sum_{i = 1}^{x - 1} \frac{\mathbb{E}[A]}{100} \\
&= -1 + \frac{(100 - x + 1)(100 + x)}{200} + \frac{x - 1}{100} \mathbb{E}[A]
\end{aligned}\]
Let's isolate $\mathbb{E}[A]$. 
\[\begin{aligned}
\mathbb{E}[A] &= \frac{(101 - x)(100 + x) - 200}{2(101-x)}
\end{aligned}\]
We now wish to determine
\[\begin{aligned}
x_\text{optimal} = \underset{x}{\text{arg max}} \left\{\frac{(101 - x)(100 + x) - 200}{2(101-x)} \right\}. 
\end{aligned}\]
Let's take the derivative with respect to $x$. 
\[\begin{aligned}
\frac{d}{dx} \mathbb{E}[A] &= \frac{2(101-x)(-2x + 1) + 2((101 - x)(100 + x) - 200)}{4(101-x)^2} \\
&= \frac{10001 - 202 x + x^2}{4(101-x)^2}
\end{aligned}\]
Setting $\frac{d}{dx} \mathbb{E}[A] = 0$ and solving for $x$, we find
\[\begin{aligned}
10001 - 202 x_\text{optimal} + x_\text{optimal}^2 &= 0 \\
x_\text{optimal} &= \frac{202 \pm \sqrt{800}}{2} \\
&= 101 \pm 10 \sqrt{2}
\end{aligned}\]
Since $x \leq 100$, $x_\text{optimal} = 101 - 10 \sqrt{2} \approx 86.9$. Our optimal integer $x$ is then either $86$ or $87$. Plugging both into $\mathbb{E}[A]$, we find $\mathbb{E}[A]$ is maximized when $x = 87$ and has value $\frac{1209}{14}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1209/14"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "4PPq98Sotm26F1Hb5Ejf",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:28:01 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3486666,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "The Picking Hat",
    "topic": "probability",
    "urlEnding": "the-picking-hat",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "hard",
    "id": "4PPq98Sotm26F1Hb5Ejf",
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
    "title": "The Picking Hat",
    "topic": "probability",
    "urlEnding": "the-picking-hat"
  }
}
```
